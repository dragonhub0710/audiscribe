import React, { useEffect, useState, useRef } from "react";
import {
  Avatar,
  Button,
  Typography,
  Dialog,
  DialogHeader,
  DialogBody,
  Radio,
} from "@material-tailwind/react";
import CountdownTimer from "@/widgets/countdowntimer/countdowntimer";
import axios from "axios";
import { ReactMic } from "react-mic";
import Lottie from "react-lottie";
import Loading_Animation from "../widgets/loading.json";
import { useNavigate } from "react-router-dom";

export function Home() {
  let messagesRef = useRef([]);
  const navigate = useNavigate();
  const [isloading, setIsloading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countTime, setCountTime] = useState(30);
  const [question, setQuestion] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [time, setTime] = useState(3);
  const defaultOption = {
    loop: true,
    autoplay: true,
    animationData: Loading_Animation,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  useEffect(() => {
    if (countTime == 1) {
      setRecording(false);
    }
  }, [countTime]);

  useEffect(() => {
    setCountTime(30);
  }, [question]);

  const handleStartRecording = () => {
    if (countTime > 1) {
      setRecording((recording) => !recording);
    }
  };

  const onStop = (recordedBlob) => {
    const file = new File([recordedBlob.blob], "recording.wav", {
      type: "audio/wav",
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("messages", JSON.stringify(messagesRef.current));
    setIsloading(true);
    axios
      .post(`${import.meta.env.VITE_API_BASED_URL}/api/question`, formData)
      .then((res) => {
        if (res.data.data.isReady == "Done") {
          messagesRef.current.push({
            role: "user",
            content: res.data.transcription,
          });
          setIsModalOpen(true);
        } else {
          messagesRef.current.push({
            role: "user",
            content: res.data.transcription,
          });
          messagesRef.current.push({
            role: "assistant",
            content: res.data.data.question,
          });
          setQuestion(res.data.data.question);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setIsloading(false);
      });
  };

  const handleGenerateBook = () => {
    setIsloading(true);
    axios
      .post(`${import.meta.env.VITE_API_BASED_URL}/api/book`, {
        messages: JSON.stringify(messagesRef.current),
        time: time,
      })
      .then((res) => {
        navigate("/audio", {
          state: {
            audioLink: res.data.data,
          },
        });
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setIsloading(false);
      });
  };

  return (
    <>
      <div className="relative flex h-full min-h-[100vh] w-full flex-col items-center justify-center bg-[#191919] px-4 pt-10">
        <div className="flex h-[204px] w-full flex-col items-center justify-center">
          <div
            onClick={handleStartRecording}
            className={`flex h-40 w-40 cursor-pointer items-center justify-center rounded-full p-4 ${
              recording ? "bg-[#FFFFFF]" : "bg-[#FBBE81]"
            }`}
          >
            <Avatar src="/img/wave.svg" className="h-auto w-28 rounded-none" />
          </div>
          <CountdownTimer status={recording} setCountTime={setCountTime} />
        </div>
        <div className="my-4 flex w-full justify-center text-center text-2xl text-white">
          {isloading ? (
            <div className="flex h-12 w-12 items-center justify-center">
              <Lottie options={defaultOption} isClickToPauseDisabled={true} />
            </div>
          ) : (
            question
          )}
        </div>
        <ReactMic record={recording} className="hidden" onStop={onStop} />
      </div>
      <Dialog open={isModalOpen} size="xl">
        <DialogHeader>
          <div className="flex w-full flex-col items-center gap-4">
            <Typography className="text-center text-lg font-semibold">
              Could you select the time?
            </Typography>
            <Typography>
              This will help us to generate a more accurate and personalized
              audiobook for you.
            </Typography>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-1">
            <Radio
              name="type"
              value={3}
              onChange={(e) => setTime(e.target.value)}
              label="3 min"
              defaultChecked
            />
            <Radio
              name="type"
              value={10}
              onChange={(e) => setTime(e.target.value)}
              label="10 min"
            />
            <Radio
              name="type"
              value={30}
              onChange={(e) => setTime(e.target.value)}
              label="30 min"
            />
          </div>
          <div className="my-5 flex w-full justify-center gap-4">
            <Button
              onClick={handleGenerateBook}
              disabled={isloading}
              className="flex items-center text-lg font-semibold normal-case"
            >
              {isloading && (
                <div className="flex h-8 w-8 items-center justify-center">
                  <Lottie
                    options={defaultOption}
                    isClickToPauseDisabled={true}
                  />
                </div>
              )}
              Submit
            </Button>
            <Button
              disabled={isloading}
              onClick={() => setIsModalOpen(false)}
              className="text-lg font-normal normal-case"
            >
              Cancel
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  );
}

export default Home;
