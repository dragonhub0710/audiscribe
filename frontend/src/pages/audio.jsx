import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import { Avatar } from "@material-tailwind/react";

export function Audio() {
  const navigate = useNavigate();
  const locationData = useLocation();
  const passedData = locationData.state;
  const [audioLink, setAudioLink] = useState("");

  useEffect(() => {
    if (passedData) {
      setAudioLink(
        `${import.meta.env.VITE_API_BASED_URL}/resources/${
          passedData.audioLink
        }`
      );
    }
  }, [passedData]);

  const handleBack = () => {
    navigate("/");
  };

  return (
    <>
      <div className="flex h-full min-h-[100vh] w-full flex-col items-center justify-center bg-[#191919]">
        <div className="relative flex h-screen w-full max-w-[400px] items-center p-4">
          <div
            onClick={handleBack}
            className="absolute left-5 top-10 flex h-8 w-10 cursor-pointer items-center justify-center rounded-lg border-[1px] border-white"
          >
            <Avatar
              src="img/back.svg"
              className="h-4 w-6 items-center justify-center"
            />
          </div>
          <div className="w-full">
            <AudioPlayer src={audioLink} className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}

export default Audio;
