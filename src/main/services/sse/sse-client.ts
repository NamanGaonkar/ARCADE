/**
 * SSEClient stub for ArcadeX.
 * ArcadeX is local-first; remote Server-Sent Events are disabled.
 */
export class SSEClient {
  static connect(): void {
    // No-op in ArcadeX
  }

  static close(): void {
    // No-op in ArcadeX
  }

  static reconnectNow(): void {
    // No-op in ArcadeX
  }
}
