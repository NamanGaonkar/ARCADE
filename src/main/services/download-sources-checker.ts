export class DownloadSourcesChecker {
  static async checkForChanges(): Promise<void> {
    // Local-first: no remote API check
    return;
  }
}
