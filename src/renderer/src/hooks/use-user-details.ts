import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import {
  setProfileBackground,
  setUserDetails,
  setFriendRequests,
  clearCollections,
} from "@renderer/features";
import type {
  FriendRequestAction,
  UpdateProfileRequest,
  UserDetails,
  FriendRequest,
} from "@types";

const LOCAL_USER_DEFAULTS: UserDetails = {
  id: "local-player",
  username: "arcadex_player",
  email: null,
  displayName: "ArcadeX Player",
  profileImageUrl: null,
  backgroundImageUrl: null,
  profileVisibility: "PUBLIC",
  allowCloudGifts: false,
  souvenirsVisibility: "PUBLIC",
  bio: "",
  subscription: null,
  workwondersJwt: "",
  karma: 0,
};

export function useUserDetails() {
  const dispatch = useAppDispatch();

  const { userDetails, profileBackground, friendRequests } =
    useAppSelector((state) => state.userDetails);

  const clearUserDetails = useCallback(async () => {
    dispatch(setUserDetails(LOCAL_USER_DEFAULTS));
    dispatch(setProfileBackground(null));
    dispatch(clearCollections());
    globalThis.window.localStorage.removeItem("userDetails");
  }, [dispatch]);

  const signOut = useCallback(async () => {
    await clearUserDetails();
  }, [clearUserDetails]);

  const updateUserDetails = useCallback(
    async (details: UserDetails) => {
      dispatch(setUserDetails(details));
      globalThis.window.localStorage.setItem(
        "userDetails",
        JSON.stringify(details)
      );
    },
    [dispatch]
  );

  const fetchUserDetails = useCallback(async (): Promise<UserDetails> => {
    const cached = globalThis.window.localStorage.getItem("userDetails");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...LOCAL_USER_DEFAULTS, ...parsed };
      } catch {
        // Fallback to defaults
      }
    }
    return LOCAL_USER_DEFAULTS;
  }, []);

  const patchUser = useCallback(
    async (values: UpdateProfileRequest) => {
      const updated: UserDetails = {
        ...(userDetails ?? LOCAL_USER_DEFAULTS),
        displayName: values.displayName ?? userDetails?.displayName ?? LOCAL_USER_DEFAULTS.displayName,
        bio: values.bio ?? userDetails?.bio ?? "",
        profileImageUrl: values.profileImageUrl ?? userDetails?.profileImageUrl ?? null,
      };
      await updateUserDetails(updated);
      return updated;
    },
    [updateUserDetails, userDetails]
  );

  const fetchFriendRequests = useCallback(async (): Promise<FriendRequest[]> => {
    dispatch(setFriendRequests([]));
    return [];
  }, [dispatch]);

  const sendFriendRequest = useCallback(async (_userId: string) => {
    // Social features disabled in ArcadeX
    return [];
  }, []);

  const updateFriendRequestState = useCallback(
    async (_userId: string, _action: FriendRequestAction) => {
      return [];
    },
    []
  );

  const undoFriendship = async (_userId: string) => {};
  const blockUser = async (_userId: string) => {};
  const unblockUser = async (_userId: string) => {};

  const hasActiveSubscription = false;

  return {
    userDetails: userDetails ?? LOCAL_USER_DEFAULTS,
    profileBackground,
    friendRequests,
    friendRequestCount: 0,
    hasActiveSubscription,
    fetchUserDetails,
    signOut,
    clearUserDetails,
    updateUserDetails,
    patchUser,
    sendFriendRequest,
    fetchFriendRequests,
    updateFriendRequestState,
    blockUser,
    unblockUser,
    undoFriendship,
  };
}
