import { useAppSelector } from "@renderer/hooks";
import { useUserDetails } from "@renderer/hooks/use-user-details";
import SteamLogo from "@renderer/assets/steam-logo.svg?react";
import { Avatar } from "../avatar/avatar";
import "./sidebar-profile.scss";

export function SidebarProfile() {
  const { userDetails } = useUserDetails();
  const { gameRunning } = useAppSelector((state) => state.gameRunning);

  const gameRunningDetails = () => {
    if (!gameRunning) return null;

    if (gameRunning.iconUrl) {
      return (
        <img
          alt={gameRunning.title}
          className="sidebar-profile__game-running-icon"
          src={gameRunning.iconUrl}
        />
      );
    }

    return <SteamLogo />;
  };

  return (
    <div className="sidebar-profile">
      <div className="sidebar-profile__button">
        <div className="sidebar-profile__button-content">
          <span className="sidebar-profile__avatar">
            <Avatar
              size={35}
              src={userDetails?.profileImageUrl}
              alt={userDetails?.displayName || "ArcadeX Player"}
            />
          </span>

          <div className="sidebar-profile__button-information">
            <p className="sidebar-profile__button-title">
              {userDetails?.displayName || "ArcadeX Player"}
            </p>

            {gameRunning ? (
              <div className="sidebar-profile__button-game-running-title">
                <small>{gameRunning.title}</small>
              </div>
            ) : (
              <div className="sidebar-profile__button-game-running-title">
                <small>Local Library</small>
              </div>
            )}
          </div>

          {gameRunningDetails()}
        </div>
      </div>
    </div>
  );
}
