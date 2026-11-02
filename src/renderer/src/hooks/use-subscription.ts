import { useCallback } from "react";
import type { HydraCloudFeature } from "@types";

export function useSubscription() {
  const showHydraCloudModal = useCallback((_feature?: HydraCloudFeature) => {}, []);
  const hideHydraCloudModal = useCallback(() => {}, []);

  return {
    isHydraCloudModalVisible: false,
    hydraCloudFeature: null,
    showHydraCloudModal,
    hideHydraCloudModal,
  };
}
