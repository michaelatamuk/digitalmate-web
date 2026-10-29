import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icons';
import { recordDiagnostic } from '../lib/diagnostics';

interface Props {
  children: ReactNode;
  tr: (english: string, chinese: string) => string;
  onReset: () => void;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('DigitalMate UI error', error, info.componentStack);
    recordDiagnostic('component', error.message, info.componentStack ?? undefined);
  }

  private reload = (): void => {
    window.location.reload();
  };

  private reset = (): void => {
    this.props.onReset();
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { tr } = this.props;

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <span className="crash-icon">
            <Icon name="info" size={22} />
          </span>
          <h1>{tr('Something went wrong', '界面出现了问题')}</h1>
          <p>
            {tr(
              'The local app hit an unexpected error. Your browser data is still stored; reload to try again, or reset the demo data if the error repeats.',
              '本地应用遇到了意外错误。浏览器数据仍然保留；可以重新加载重试，如果反复出错再重置演示数据。'
            )}
          </p>
          <pre>{error.message}</pre>
          <div className="crash-actions">
            <button type="button" className="primary-action" onClick={this.reload}>
              <Icon name="refresh" size={15} />
              {tr('Reload', '重新加载')}
            </button>
            <button type="button" className="secondary-action" onClick={this.reset}>
              <Icon name="trash" size={15} />
              {tr('Reset local demo data', '重置本地演示数据')}
            </button>
          </div>
          <p className="crash-note">
            {tr('No account or upload is involved.', '整个过程不需要账号，也不会上传数据。')}
          </p>
        </div>
      </div>
    );
  }
}
