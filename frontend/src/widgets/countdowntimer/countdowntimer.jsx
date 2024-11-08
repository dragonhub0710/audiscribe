import { Typography } from "@material-tailwind/react";
import React, { useState, useEffect } from "react";

const CountdownTimer = (props) => {
  // Initial time set to 30s in seconds
  const initialTime = 30;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // Exit early when we reach 0
    if (!props.status || timeLeft === 0) return;
    // Save intervalId to clear the interval when the
    // component re-renders or unmounts
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
      props.setCountTime(timeLeft);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, isStarted]);

  useEffect(() => {
    if (props.status) {
      setTimeLeft(30);
      setIsStarted(true);
    }
  }, [props.status]);

  // Format timeLeft into mm:ss
  const formatTimeLeft = () => {
    return `${timeLeft.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex text-[white]">
      <Typography className="text-5xl font-light">
        {formatTimeLeft()}
      </Typography>
      <Typography className="mx-[2px] mt-[2px] text-xl font-light">
        S
      </Typography>
    </div>
  );
};

export default CountdownTimer;
