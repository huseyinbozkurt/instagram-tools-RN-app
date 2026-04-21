import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// TODO (production): Replace TestIds.REWARDED with your real ad unit ID:
//   ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
// TODO (production): Update androidAppId in app.json and AndroidManifest.xml
//   with your real AdMob App ID: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
const AD_UNIT_ID = TestIds.REWARDED;

export type RewardedAdCallbacks = {
  onRewarded: () => void;
  onDismissed: () => void;
  onFailed: (error: Error) => void;
};

class RewardedAdManager {
  private static _instance: RewardedAdManager | null = null;

  private ad: RewardedAd;
  private loaded = false;
  private loading = false;
  private earnedReward = false;
  private pending: RewardedAdCallbacks | null = null;
  private unsubs: Array<() => void> = [];

  private constructor() {
    this.ad = this.buildAd();
    this.loadInternal();
  }

  static getInstance(): RewardedAdManager {
    if (!RewardedAdManager._instance) {
      RewardedAdManager._instance = new RewardedAdManager();
    }
    return RewardedAdManager._instance;
  }

  private buildAd(): RewardedAd {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];

    const ad = RewardedAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    this.unsubs.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] Rewarded ad loaded');
        this.loaded = true;
        this.loading = false;
      })
    );

    this.unsubs.push(
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        console.log('[AdMob] Reward earned:', reward);
        this.earnedReward = true;
        const cb = this.pending;
        this.pending = null;
        cb?.onRewarded();
      })
    );

    this.unsubs.push(
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdMob] Ad closed');
        this.loaded = false;
        if (!this.earnedReward) {
          // User closed the ad without watching it to completion
          const cb = this.pending;
          this.pending = null;
          cb?.onDismissed();
        }
        this.earnedReward = false;
        // Preload the next ad immediately after close
        this.ad = this.buildAd();
        this.loadInternal();
      })
    );

    this.unsubs.push(
      ad.addAdEventListener(AdEventType.ERROR, (error: Error) => {
        console.error('[AdMob] Error:', error.message);
        this.loaded = false;
        this.loading = false;
        const cb = this.pending;
        this.pending = null;
        cb?.onFailed(error);
      })
    );

    return ad;
  }

  private loadInternal() {
    if (this.loaded || this.loading) return;
    this.loading = true;
    this.ad.load();
  }

  /** Call once at app startup or screen mount to preload an ad. */
  load() {
    this.loadInternal();
  }

  get isReady(): boolean {
    return this.loaded;
  }

  get isLoading(): boolean {
    return this.loading;
  }

  /**
   * Shows the loaded ad. Returns false if no ad is ready.
   * Callbacks fire exactly once per call.
   */
  show(callbacks: RewardedAdCallbacks): boolean {
    if (!this.loaded) return false;
    this.earnedReward = false;
    this.pending = callbacks;
    try {
      this.ad.show();
    } catch (err) {
      this.pending = null;
      callbacks.onFailed(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
    return true;
  }
}

export default RewardedAdManager;
