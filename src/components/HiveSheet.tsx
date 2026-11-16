import { useEffect, useMemo, useRef, useState } from 'react';
import type { HiveArtifact, HiveSnapshot } from '../domain/hive';
import {
  currentTask,
  laneActivity,
  laneCutoff,
  laneHasActivityGap,
  laneLastActivity,
  laneMemory,
  laneUnreadCount,
  latestTask,
  memoryInUse,
  relativeTime,
  taskRef,
  taskStatusLabel
} from '../domain/hive';
import { currentHiveTransport } from '../transport/hiveBridge';
import type { HiveTransport, HiveTransportStatus } from '../transport/hive';
import { Sheet } from './Overlays';
import { Icon } from './Icons';
import { useI18n } from '../i18n/I18nContext';

function shortTime(value: number, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Saves text from the demo without touching the network. */
function downloadText(filename: string, content: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HiveSheet({
  onClose,
  onNotice
}: {
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const { lang, locale, tr } = useI18n();
  // One transport for the session: StrictMode double-mounts effects, so disposing on unmount would
  // hand the second mount a dead transport. A configured bridge also keeps its stream open, which
  // is what later notification work needs.
  const hive = currentHiveTransport();
  const [snapshot, setSnapshot] = useState<HiveSnapshot>(() => hive.snapshot());
  const [status, setStatus] = useState<HiveTransportStatus>(() => hive.status());
  // Drafts and attachments are kept per lane, so switching Bees never discards unsent work.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attachmentsByLane, setAttachmentsByLane] = useState<Record<string, string[]>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmStopId, setConfirmStopId] = useState('');
  const [busy, setBusy] = useState(false);
  const [openArtifact, setOpenArtifact] = useState('');
  const [view, setView] = useState<'tasks' | 'activity' | 'memory'>('tasks');
  const [activitySeenAt, setActivitySeenAt] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return hive.subscribe(event => {
      setSnapshot(event.snapshot);
      setStatus(hive.status());
    });
  }, [hive]);

  const lane = snapshot.lanes.find(item => item.id === snapshot.selectedLaneId) ?? snapshot.lanes[0];
  const now = Date.now();
  const laneDraftKey = lane?.id ?? '';
  const draft = drafts[laneDraftKey] ?? '';
  const attachments = attachmentsByLane[laneDraftKey] ?? [];
  const setDraft = (value: string): void => {
    setDrafts(current => ({ ...current, [laneDraftKey]: value }));
  };
  const setAttachments = (updater: string[] | ((current: string[]) => string[])): void => {
    setAttachmentsByLane(current => {
      const existing = current[laneDraftKey] ?? [];
      const next = typeof updater === 'function' ? updater(existing) : updater;
      return { ...current, [laneDraftKey]: next };
    });
  };
  const laneTasks = useMemo(
    () =>
      [...snapshot.tasks]
        .filter(task => task.laneId === lane?.id)
        .sort((left, right) => right.createdAt - left.createdAt),
    [lane?.id, snapshot.tasks]
  );
  const openTask = lane ? currentTask(snapshot.tasks, lane.id) : undefined;
  const selectedTask =
    snapshot.tasks.find(task => task.id === snapshot.selectedTaskId) ??
    openTask ??
    (lane ? latestTask(snapshot.tasks, lane.id) : undefined);
  // Answer drafts are kept in two places: the local echo keeps typing smooth, and the question's
  // draft field makes the text survive a lane switch or a reload.
  const answerKey = selectedTask?.question?.id ?? '';
  const answer = answerKey
    ? (answers[answerKey] ?? selectedTask?.question?.draft ?? '')
    : '';
  const setAnswer = (value: string): void => {
    if (!answerKey || !selectedTask?.question) return;
    setAnswers(current => ({ ...current, [answerKey]: value }));
    hive.saveAnswerDraft(selectedTask.id, answerKey, value);
  };
  const laneMessages = snapshot.messages
    .filter(message => message.laneId === lane?.id)
    .slice(-6);
  const activeLanes = snapshot.lanes.filter(item => item.kind === 'bee' && item.lifecycle === 'active');
  const laneFeed = lane ? laneActivity(snapshot, lane.id) : [];
  const laneUnread = lane ? laneUnreadCount(snapshot, lane.id) : 0;
  const laneGap = lane ? laneHasActivityGap(snapshot, lane.id) : false;
  const laneMemories = lane ? laneMemory(snapshot, lane.id) : [];
  const memoryCutoff = lane ? laneCutoff(snapshot, lane.id) : 0;
  const memoryUsed = lane ? memoryInUse(snapshot, lane.id).length : 0;

  const openActivity = (laneId: string): void => {
    // Freeze the cursor before marking read so the entries added in this session stay marked "new".
    setActivitySeenAt(snapshot.activityReadAt[laneId] ?? 0);
    setView('activity');
    hive.markActivityRead(laneId);
  };

  const exportHive = (): void => {
    const backup = hive.exportBackup();
    if (!backup) return;
    downloadText(
      `digitalmate-hive-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json'
    );
    onNotice(tr('Hive backup exported.', '蜂巢备份已导出。'));
  };

  const exportArtifact = (artifact: HiveArtifact): void => {
    const extension = artifact.kind === 'report' ? 'md' : 'txt';
    const safeName = artifact.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'artifact';
    downloadText(`${safeName}.${extension}`, artifact.content);
    onNotice(tr('Artifact exported.', '成果已导出。'));
  };

  const importHive = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const text = await file.text();
    const result = hive.importBackup(text);
    if (result?.ok) {
      setView('tasks');
      onNotice(tr('Hive backup imported.', '蜂巢备份已导入。'));
      return;
    }
    onNotice(result?.error ?? tr('That backup could not be imported.', '无法导入该备份。'));
  };

  if (!lane) {
    return (
      <Sheet
        title={tr('Hive', '蜂巢')}
        subtitle={tr('Preparing the local Hive…', '正在准备本地蜂巢…')}
        onClose={onClose}
        wide
      >
        <p className="settings-note">{tr('Loading Beebou and the Bees…', '正在加载 Beebou 和 Bee…')}</p>
      </Sheet>
    );
  }

  const act = async (operation: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    try {
      await operation();
      if (message) onNotice(message);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : tr('That action failed.', '操作失败。'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (mode: 'send' | 'steer' | 'queue' | 'preempt') => {
    if (!lane || lane.kind !== 'bee' || !draft.trim()) return;
    const text = draft.trim();
    if (mode === 'send') {
      await act(() => hive.send({ laneId: lane.id, text, attachments }), tr('Sent to the Bee.', '已发送给 Bee。'));
    } else if (openTask) {
      await act(
        () => hive.control(openTask.id, mode, text),
        mode === 'steer'
          ? tr('Steer applied.', '补充已应用。')
          : mode === 'queue'
            ? tr('Queued behind the current task.', '已排到当前任务之后。')
            : tr('Current task stopped; new task started.', '当前任务已停止，新任务已开始。')
      );
    }
    setDraft('');
    setAttachments([]);
  };

  const submitAnswer = async () => {
    if (!selectedTask?.question || !answer.trim()) return;
    const question = selectedTask.question;
    await act(
      () => hive.answer(selectedTask.id, question.id, answer),
      tr('Answer sent.', '答复已发送。')
    );
    setAnswers(current => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });
  };

  return (
    <Sheet
      title={tr('Hive', '蜂巢')}
      subtitle={tr('Beebou, Bees and their current work · local demo', 'Beebou、Bee 与当前工作 · 本地演示')}
      onClose={onClose}
      wide
    >
      <div className="hive">
        <div className="hive-top">
          <div className="hive-host">
            <span className="hive-host-avatar">✦</span>
            <div>
              <strong>Beebou</strong>
              <em>{tr('Routes work, keeps the lanes calm', '分派任务，保持各条工作线有序')}</em>
            </div>
            <span className="hive-live">
              <span className="live-dot" />
              {status.mode === 'bridge'
                ? status.state === 'ready'
                  ? tr('Hive bridge', '蜂巢桥接')
                  : tr('Bridge offline', '桥接离线')
                : tr('Local mock', '本地模拟')}
            </span>
          </div>
          {status.mode === 'bridge' && status.state !== 'ready' ? (
            <div className="hive-bridge-banner" role="status">
              <span>
                {status.state === 'connecting'
                  ? (status.message || tr('Connecting to the Hive bridge…', '正在连接蜂巢桥接…'))
                  : tr(`Hive bridge unavailable: ${status.message}`, `蜂巢桥接不可用：${status.message}`)}
              </span>
              <button
                type="button"
                className="hive-link"
                onClick={() => {
                  hive.retry();
                  setStatus(hive.status());
                }}
              >
                {tr('Retry', '重试')}
              </button>
            </div>
          ) : null}
          {status.mode === 'bridge' && status.state === 'ready' ? (
            <p className="hive-diagnostics">
              {tr('Contract v', '契约 v')}{status.version ?? 1}
              {' · '}
              {(status.features ?? []).join(', ') || tr('baseline', '基础能力')}
              {status.negotiated === false ? tr(' (probe missing)', '（未探测）') : ''}
            </p>
          ) : null}
          <div className="hive-backup-actions">
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden-file-input"
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void importHive(file);
              }}
            />
            <button type="button" className="hive-link" onClick={exportHive}>
              {tr('Export backup', '导出备份')}
            </button>
            <button type="button" className="hive-link" onClick={() => importRef.current?.click()}>
              {tr('Import backup', '导入备份')}
            </button>
          </div>
          <div className="hive-lane-strip" role="tablist" aria-label={tr('Hive lanes', '蜂巢工作线')}>
            {activeLanes.map(item => (
              <button
                type="button"
                role="tab"
                aria-selected={lane?.id === item.id}
                className={`hive-lane ${lane?.id === item.id ? 'is-active' : ''}`}
                key={item.id}
                onClick={() => {
                  hive.selectLane(item.id);
                  setView('tasks');
                }}
              >
                <span className="hive-avatar" style={{ background: item.color }}>{item.avatar}</span>
                <span>{item.label}</span>
                {latestTask(snapshot.tasks, item.id) ? (
                  <span className="hive-lane-time">
                    {relativeTime(laneLastActivity(snapshot.lanes, snapshot.tasks, item.id), now, tr)}
                  </span>
                ) : null}
                {laneUnreadCount(snapshot, item.id) > 0 ? (
                  <span className="hive-unread" aria-label={tr('Unread activity', '未读动态')}>
                    {laneUnreadCount(snapshot, item.id)}
                  </span>
                ) : null}
                {currentTask(snapshot.tasks, item.id) ? <span className="hive-pulse" /> : null}
              </button>
            ))}
            <button
              type="button"
              role="tab"
              aria-selected={lane?.id === 'beebou'}
              className={`hive-lane ${lane?.id === 'beebou' ? 'is-active' : ''}`}
              onClick={() => {
                hive.selectLane('beebou');
              }}
            >
              <span className="hive-avatar" style={{ background: '#a06b58' }}>✦</span>
              <span>Beebou</span>
            </button>
          </div>
        </div>

        {lane?.kind === 'beebou' ? (
          <div className="hive-empty">
            <span className="hive-big-mark">✦</span>
            <h3>{tr('Choose a Bee to start', '选择一个 Bee 开始')}</h3>
            <p>
              {tr(
                'Each Bee keeps its own lane, task history and artifacts. Beebou only routes.',
                '每个 Bee 有自己的工作线、任务历史和成果。Beebou 只负责分派。'
              )}
            </p>
            <div className="hive-bee-grid">
              {activeLanes.map(item => {
                const latest = latestTask(snapshot.tasks, item.id);
                return (
                  <button
                    type="button"
                    className="hive-bee-card"
                    key={item.id}
                    onClick={() => hive.selectLane(item.id)}
                  >
                    <span className="hive-avatar" style={{ background: item.color }}>{item.avatar}</span>
                    <strong>{item.label}</strong>
                    <em>{item.description}</em>
                    <span className="hive-bee-meta">
                      {latest ? (
                        <span className={`hive-status is-${latest.status}`}>{taskStatusLabel(latest.status, tr)}</span>
                      ) : null}
                      {latest ? <code className="hive-ref">{taskRef(latest)}</code> : null}
                      {latest ? (
                        <span className="hive-bee-time">
                          {relativeTime(laneLastActivity(snapshot.lanes, snapshot.tasks, item.id), now, tr)}
                        </span>
                      ) : (
                        <span className="hive-bee-time">{tr('No tasks yet', '还没有任务')}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="hive-body">
              <div className="hive-task-list">
                <div className="hive-section-head">
                  <div className="hive-view-tabs" role="tablist" aria-label={tr('Lane view', '工作线视图')}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'tasks'}
                      className={`hive-view-tab ${view === 'tasks' ? 'is-active' : ''}`}
                      onClick={() => setView('tasks')}
                    >
                      {tr('Tasks', '任务')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'activity'}
                      className={`hive-view-tab ${view === 'activity' ? 'is-active' : ''}`}
                      onClick={() => openActivity(lane.id)}
                    >
                      {tr('Activity', '动态')}
                      {laneUnread > 0 ? <span className="hive-unread is-inline">{laneUnread}</span> : null}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={view === 'memory'}
                      className={`hive-view-tab ${view === 'memory' ? 'is-active' : ''}`}
                      onClick={() => setView('memory')}
                    >
                      {tr('Memory', '记忆')}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="hive-link"
                    onClick={() => {
                      hive.reset();
                      onNotice(tr('Hive demo reset.', '蜂巢演示已重置。'));
                    }}
                  >
                    {tr('Reset', '重置')}
                  </button>
                </div>
                {view === 'activity' ? (
                  <div className="hive-activity" role="feed" aria-label={tr('Lane activity', '工作线动态')}>
                    {laneGap ? (
                      <p className="hive-gap">
                        {tr('Older activity was not kept in this demo.', '此演示未保留更早的动态。')}
                      </p>
                    ) : null}
                    {laneFeed.length === 0 ? (
                      <p className="settings-note">{tr('No activity in this lane yet.', '这条工作线还没有动态。')}</p>
                    ) : (
                      laneFeed.map(item => {
                        const isNew = item.at > activitySeenAt;
                        return (
                          <button
                            type="button"
                            className={`hive-activity-row is-${item.kind} ${selectedTask?.id === item.taskId ? 'is-active' : ''}`}
                            key={item.id}
                            onClick={() => hive.selectTask(item.taskId)}
                          >
                            <span className={`hive-activity-dot is-${item.kind}`} />
                            <span className="hive-activity-copy">
                              <strong>{item.text}</strong>
                              <em>{shortTime(item.at, locale)}</em>
                            </span>
                            {isNew ? <span className="hive-new">{tr('New', '新')}</span> : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : view === 'memory' ? (
                  <div className="hive-memory" role="list" aria-label={tr('Lane memory', '工作线记忆')}>
                    <div className="hive-memory-head">
                      <span>
                        {tr(
                          `${memoryUsed} of ${laneMemories.length} in use`,
                          `使用中 ${memoryUsed} / ${laneMemories.length}`
                        )}
                      </span>
                      {memoryCutoff > 0 ? (
                        <button
                          type="button"
                          className="hive-link"
                          hidden={!hive.supports('memoryCutoff')}
                          onClick={() => {
                            hive.restoreMemory(lane.id);
                            onNotice(tr('Memory cut-off cleared.', '记忆截断已清除。'));
                          }}
                        >
                          {tr('Restore all', '全部恢复')}
                        </button>
                      ) : null}
                    </div>
                    {laneMemories.length === 0 ? (
                      <p className="settings-note">{tr('Nothing remembered in this lane yet.', '这条工作线还没有记忆。')}</p>
                    ) : (
                      laneMemories.map(entry => {
                        const cut = memoryCutoff > 0 && entry.at <= memoryCutoff;
                        return (
                          <div className={`hive-memory-row ${cut ? 'is-cut' : ''}`} key={entry.id} role="listitem">
                            <div className="hive-memory-copy">
                              <strong>{entry.text}</strong>
                              <em>
                                {entry.kind.replace('_', ' ')} · {shortTime(entry.at, locale)}
                              </em>
                            </div>
                            {cut ? (
                              <span className="hive-erased">{tr('Cut off', '已截断')}</span>
                            ) : hive.supports('memoryCutoff') ? (
                              <button
                                type="button"
                                className="hive-link"
                                onClick={() => {
                                  hive.cutOffMemory(lane.id, entry.at);
                                  onNotice(tr('Memory before this entry is cut off.', '此条之前的记忆已截断。'));
                                }}
                              >
                                {tr('Cut off here', '从此截断')}
                              </button>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : laneTasks.length === 0 ? (
                  <p className="settings-note">{tr('No tasks in this lane yet.', '这条工作线还没有任务。')}</p>
                ) : (
                  laneTasks.slice(0, 6).map(task => (
                    <button
                      type="button"
                      className={`hive-task-row ${selectedTask?.id === task.id ? 'is-active' : ''}`}
                      key={task.id}
                      onClick={() => hive.selectTask(task.id)}
                    >
                      <span className={`hive-status-dot is-${task.status}`} />
                      <span>
                        <strong>{task.title}</strong>
                        <em>
                          <code className="hive-ref">{taskRef(task)}</code> · {task.step} · {shortTime(task.updatedAt, locale)}
                        </em>
                      </span>
                      <span className={`hive-status is-${task.status}`}>{taskStatusLabel(task.status, tr)}</span>
                    </button>
                  ))
                )}
              </div>

              <div className="hive-detail">
                {selectedTask ? (
                  <>
                    <div className="hive-detail-head">
                      <div>
                        <span className={`hive-status is-${selectedTask.status}`}>
                          {taskStatusLabel(selectedTask.status, tr)}
                        </span>
                        <h3>{selectedTask.title}</h3>
                      </div>
                      {selectedTask.status === 'running' || selectedTask.status === 'waiting_user' ? (
                        confirmStopId === selectedTask.id ? (
                          <div className="hive-stop-confirm">
                            <span>{tr('Stop this task?', '停止这个任务？')}</span>
                            <button
                              type="button"
                              className="hive-link"
                              onClick={() => setConfirmStopId('')}
                            >
                              {tr('Keep working', '继续执行')}
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() => {
                                setConfirmStopId('');
                                void act(() => hive.stop(selectedTask.id), tr('Stopped.', '已停止。'));
                              }}
                            >
                              {tr('Stop task', '停止任务')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={() => setConfirmStopId(selectedTask.id)}
                          >
                            <Icon name="close" size={13} />
                            {tr('Stop', '停止')}
                          </button>
                        )
                      ) : null}
                    </div>
                    <p className="hive-step"><span className="live-dot" />{selectedTask.step}</p>
                    {selectedTask.attachments.length > 0 ? (
                      <div className="hive-attachments">
                        {selectedTask.attachments.map(item => (
                          <span key={item}><Icon name="grid" size={12} />{item}</span>
                        ))}
                      </div>
                    ) : null}
                    {selectedTask.question && !selectedTask.question.answer ? (
                      <div className="hive-question">
                        <strong>{tr('A Bee needs your answer', 'Bee 需要你的答复')}</strong>
                        <p>{selectedTask.question.question}</p>
                        <textarea
                          className="field-input"
                          value={answer}
                          onChange={event => setAnswer(event.target.value)}
                          placeholder={tr('Write an answer…', '写一个答复…')}
                          aria-label={tr('Answer the Bee', '回答 Bee')}
                          rows={2}
                        />
                        <button
                          type="button"
                          className="primary-action"
                          disabled={!answer.trim() || busy}
                          onClick={() => void submitAnswer()}
                        >
                          {tr('Send answer', '发送答复')}
                        </button>
                      </div>
                    ) : null}
                    {selectedTask.steering.length > 0 ? (
                      <div className="hive-steers">
                        {selectedTask.steering.map((item, index) => (
                          <span key={`${selectedTask.id}-steer-${index}`}>{item}</span>
                        ))}
                      </div>
                    ) : null}
                    {selectedTask.output ? <p className="hive-output">{selectedTask.output}</p> : null}
                    {selectedTask.report ? (
                      <div className="hive-report">
                        <strong>{selectedTask.report.title}</strong>
                        <p>{selectedTask.report.summary}</p>
                        {selectedTask.report.sections.map(section => (
                          <div key={section.label}>
                            <em>{section.label}</em>
                            <span>{section.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {selectedTask.artifacts.length > 0 ? (
                      <div className="hive-artifacts">
                        <span className="hive-section-head">{tr('Artifacts', '成果')}</span>
                        {selectedTask.artifacts.map(artifact => (
                          <div className="hive-artifact-block" key={artifact.id}>
                            <div className="hive-artifact">
                              <button
                                type="button"
                                className="hive-artifact-open"
                                onClick={() => setOpenArtifact(current => (current === artifact.id ? '' : artifact.id))}
                              >
                                <strong>{artifact.title}</strong>
                                <em>{artifact.kind} · {shortTime(artifact.createdAt, locale)}</em>
                              </button>
                              {artifact.erasedAt ? (
                                <span className="hive-erased">{tr('Erased', '已清除')}</span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="hive-link"
                                    onClick={() => exportArtifact(artifact)}
                                  >
                                    {tr('Export', '导出')}
                                  </button>
                                  <button
                                    type="button"
                                    className="hive-link"
                                    onClick={() => {
                                      hive.eraseArtifact(artifact.id);
                                      onNotice(tr('Artifact erased.', '成果已清除。'));
                                    }}
                                  >
                                    {tr('Erase', '清除')}
                                  </button>
                                </>
                              )}
                            </div>
                            {openArtifact === artifact.id && !artifact.erasedAt ? (
                              <pre className="hive-artifact-preview">{artifact.content}</pre>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="settings-note">{tr('Select a task to see its detail.', '选择任务查看详情。')}</p>
                )}
              </div>
            </div>

            <div className="hive-composer">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden-file-input"
                onChange={event => {
                  const names = event.target.files ? Array.from(event.target.files).map(file => file.name) : [];
                  event.target.value = '';
                  setAttachments(current => [...current, ...names].slice(0, 5));
                }}
              />
              <div className="hive-composer-head">
                <span className="hive-avatar" style={{ background: lane.color }}>{lane.avatar}</span>
                <strong>{lane.label}</strong>
                <em>{lane.description}</em>
                <button type="button" className="hive-link" onClick={() => fileRef.current?.click()}>
                  {tr('Attach', '附件')}
                </button>
              </div>
              {attachments.length > 0 ? (
                <div className="hive-attachments">
                  {attachments.map((item, index) => (
                    <span key={`${item}-${index}`}>
                      <Icon name="grid" size={12} />
                      {item}
                      <button
                        type="button"
                        className="hive-attachment-remove"
                        aria-label={tr(`Remove ${item}`, `移除 ${item}`)}
                        onClick={() => setAttachments(current => current.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <textarea
                className="field-input"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder={tr(
                  `Ask ${lane.label} for something…`,
                  `让 ${lane.label} 做点什么…`
                )}
                aria-label={tr('Hive message', '蜂巢消息')}
                rows={2}
              />
              <div className="hive-actions">
                {hive.hasFailedOperation() ? (
                  <div className="hive-retry">
                    <span>{tr('The last action did not reach the bridge.', '上一个操作未送达桥接。')}</span>
                    <button
                      type="button"
                      className="hive-link"
                      onClick={() => {
                        void hive.retryLastOperation()
                          .then(() => onNotice(tr('Action retried.', '操作已重试。')))
                          .catch((error: unknown) =>
                            onNotice(error instanceof Error ? error.message : tr('Retry failed.', '重试失败。')));
                      }}
                    >
                      {tr('Retry', '重试')}
                    </button>
                  </div>
                ) : null}
                <button type="button" className="primary-action" disabled={!draft.trim() || busy} onClick={() => void submit('send')}>
                  <Icon name="send" size={14} />
                  {tr('Send', '发送')}
                </button>
                {openTask ? (
                  <>
                    {hive.supports('queue') ? (
                      <button type="button" className="secondary-action" disabled={!draft.trim() || busy} onClick={() => void submit('queue')}>
                        {tr('Queue', '排队')}
                      </button>
                    ) : null}
                    {openTask.status === 'running' && hive.supports('steer') ? (
                      <button type="button" className="secondary-action" disabled={!draft.trim() || busy} onClick={() => void submit('steer')}>
                        {tr('Steer', '补充')}
                      </button>
                    ) : null}
                    {hive.supports('preempt') ? (
                      <button type="button" className="secondary-action" disabled={!draft.trim() || busy} onClick={() => void submit('preempt')}>
                        {tr('Preempt', '抢占')}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {laneMessages.length > 0 ? (
              <div className="hive-feed">
                {laneMessages.map(message => (
                  <div className={`hive-message is-${message.role}`} key={message.id}>
                    <span>{message.role === 'user' ? tr('You', '你') : lane.label}</span>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  );
}
