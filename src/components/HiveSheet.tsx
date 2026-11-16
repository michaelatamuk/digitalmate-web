import { useEffect, useMemo, useRef, useState } from 'react';
import type { HiveSnapshot } from '../domain/hive';
import { currentTask, latestTask, taskStatusLabel } from '../domain/hive';
import { MockHiveTransport } from '../transport/hive';
import { Sheet } from './Overlays';
import { Icon } from './Icons';
import { useI18n } from '../i18n/I18nContext';

function shortTime(value: number, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function HiveSheet({
  onClose,
  onNotice
}: {
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const { lang, locale, tr } = useI18n();
  const transport = useRef<MockHiveTransport | null>(null);
  if (!transport.current) transport.current = new MockHiveTransport();
  const hive = transport.current;
  const [snapshot, setSnapshot] = useState<HiveSnapshot>(() => hive.snapshot());
  const [draft, setDraft] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [openArtifact, setOpenArtifact] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => hive.subscribe(event => setSnapshot(event.snapshot)), [hive]);

  const lane = snapshot.lanes.find(item => item.id === snapshot.selectedLaneId) ?? snapshot.lanes[0];
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
  const laneMessages = snapshot.messages
    .filter(message => message.laneId === lane?.id)
    .slice(-6);
  const activeLanes = snapshot.lanes.filter(item => item.kind === 'bee' && item.lifecycle === 'active');

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
      await act(() => transport.current!.send({ laneId: lane.id, text, attachments }), tr('Sent to the Bee.', '已发送给 Bee。'));
    } else if (openTask) {
      await act(
        () => transport.current!.control(openTask.id, mode, text),
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
      () => transport.current!.answer(selectedTask.id, question.id, answer),
      tr('Answer sent.', '答复已发送。')
    );
    setAnswer('');
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
            <span className="hive-live"><span className="live-dot" />{tr('Local mock', '本地模拟')}</span>
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
                  transport.current?.selectLane(item.id);
                  setAnswer('');
                  setDraft('');
                }}
              >
                <span className="hive-avatar" style={{ background: item.color }}>{item.avatar}</span>
                <span>{item.label}</span>
                {currentTask(snapshot.tasks, item.id) ? <span className="hive-pulse" /> : null}
              </button>
            ))}
            <button
              type="button"
              role="tab"
              aria-selected={lane?.id === 'beebou'}
              className={`hive-lane ${lane?.id === 'beebou' ? 'is-active' : ''}`}
              onClick={() => {
                transport.current?.selectLane('beebou');
                setAnswer('');
                setDraft('');
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
              {activeLanes.map(item => (
                <button
                  type="button"
                  className="hive-bee-card"
                  key={item.id}
                  onClick={() => transport.current?.selectLane(item.id)}
                >
                  <span className="hive-avatar" style={{ background: item.color }}>{item.avatar}</span>
                  <strong>{item.label}</strong>
                  <em>{item.description}</em>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="hive-body">
              <div className="hive-task-list">
                <div className="hive-section-head">
                  <span>{tr('Activity', '动态')}</span>
                  <button
                    type="button"
                    className="hive-link"
                    onClick={() => {
                      transport.current?.reset();
                      onNotice(tr('Hive demo reset.', '蜂巢演示已重置。'));
                    }}
                  >
                    {tr('Reset', '重置')}
                  </button>
                </div>
                {laneTasks.length === 0 ? (
                  <p className="settings-note">{tr('No tasks in this lane yet.', '这条工作线还没有任务。')}</p>
                ) : (
                  laneTasks.slice(0, 6).map(task => (
                    <button
                      type="button"
                      className={`hive-task-row ${selectedTask?.id === task.id ? 'is-active' : ''}`}
                      key={task.id}
                      onClick={() => transport.current?.selectTask(task.id)}
                    >
                      <span className={`hive-status-dot is-${task.status}`} />
                      <span>
                        <strong>{task.title}</strong>
                        <em>{task.step} · {shortTime(task.updatedAt, locale)}</em>
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
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => act(() => transport.current!.stop(selectedTask.id), tr('Stopped.', '已停止。'))}
                        >
                          <Icon name="close" size={13} />
                          {tr('Stop', '停止')}
                        </button>
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
                                <button
                                  type="button"
                                  className="hive-link"
                                  onClick={() => {
                                    transport.current?.eraseArtifact(artifact.id);
                                    onNotice(tr('Artifact erased.', '成果已清除。'));
                                  }}
                                >
                                  {tr('Erase', '清除')}
                                </button>
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
                <button type="button" className="primary-action" disabled={!draft.trim() || busy} onClick={() => void submit('send')}>
                  <Icon name="send" size={14} />
                  {tr('Send', '发送')}
                </button>
                {openTask ? (
                  <>
                    <button type="button" className="secondary-action" disabled={!draft.trim() || busy} onClick={() => void submit('queue')}>
                      {tr('Queue', '排队')}
                    </button>
                    {openTask.status === 'running' ? (
                      <button type="button" className="secondary-action" disabled={!draft.trim() || busy} onClick={() => void submit('steer')}>
                        {tr('Steer', '补充')}
                      </button>
                    ) : null}
                    <button type="button" className="secondary-action" disabled={!draft.trim() || busy} onClick={() => void submit('preempt')}>
                      {tr('Preempt', '抢占')}
                    </button>
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
