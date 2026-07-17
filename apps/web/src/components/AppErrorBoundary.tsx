import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportOperationalError } from "../lib/observability";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  correlationId: string | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, correlationId: null };

  static getDerivedStateFromError(): State {
    return { failed: true, correlationId: null };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    void reportOperationalError("ui_error", "unhandled_render_error", error).then((incident) => {
      this.setState({ correlationId: incident.correlationId });
    });
  }

  render() {
    if (this.state.failed) {
      return <main className="fatal-screen"><section><div className="brand-mark">PS</div><h1>Não foi possível exibir esta tela.</h1><p>Recarregue a aplicação. Se o problema continuar, informe o código abaixo ao suporte.</p><code>{this.state.correlationId ?? "registrando-incidente"}</code><button className="primary" onClick={() => window.location.reload()}>Recarregar aplicação</button></section></main>;
    }
    return this.props.children;
  }
}
