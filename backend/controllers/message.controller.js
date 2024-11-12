const fs = require("fs");
const path = require("path");
const { createClient } = require("@deepgram/sdk");
const OpenAI = require("openai");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

exports.handleQuestions = async (req, res) => {
  try {
    const { messages } = req.body;
    const file = req.file;

    let transcription = "";
    transcription = await getTranscription(file.buffer);
    let data = await getResponse(JSON.parse(messages), transcription);

    res.status(200).json({ data, transcription });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.handleBook = async (req, res) => {
  try {
    const { messages, time } = req.body;
    let data = await getGenerateBook(messages, time);

    res.status(200).json({ data });
    cleanupAudioFiles(data);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cleanupAudioFiles = (bookId, delayInHours = 2) => {
  setTimeout(async () => {
    try {
      // Delete final merged file
      const finalFilePath = `./resources/${bookId}`;
      await fs
        .unlinkSync(finalFilePath)
        .catch((err) => console.log(`Failed to delete ${finalFilePath}:`, err));

      console.log(`Cleaned up audio files for book ${bookId}`);
    } catch (error) {
      console.error(`Error cleaning up audio files for book ${bookId}:`, error);
    }
  }, delayInHours * 60 * 60 * 1000); // Convert hours to milliseconds
};

const getGenerateBook = async (msgs, time) => {
  try {
    let transcription = [];

    // To extract the topic from the chat history
    let list = [];
    list.unshift({
      role: "system",
      content:
        "Please extract the summarized topic the user wants from the below chatting history.\n\n" +
        `chat_history: ${msgs}`,
    });
    const topicCompletion = await openai.chat.completions.create({
      messages: list,
      model: "gpt-4o",
    });
    const topic = topicCompletion.choices[0].message.content;
    console.log({ topic });

    // To generate the chapters with topic
    if (time == 3) {
      // if time is 3 mins
      let chapterContent = await generateChapter(topic, []);
      transcription.push(chapterContent);
    } else {
      // if time is 10 mins or 30 mins
      // To generate the table of contents with topic and chapter counts
      let chapterlist = [];
      let chapterCount = time == 10 ? 3 : 10;
      chapterlist.push({
        role: "assistant",
        content:
          process.env.GENERATE_TABLE_OF_CONTENTS_PROMPT +
          `topic: ${topic}\n\nchapter counts: ${chapterCount}`,
      });
      chapterlist.push({
        role: "user",
        content: "Please generate the table of contents",
      });
      const chapterCompletion = await openai.chat.completions.create({
        messages: chapterlist,
        model: "gpt-4o",
        response_format: { type: "json_object" },
      });
      const chapterData = JSON.parse(
        chapterCompletion.choices[0].message.content
      );
      console.log({ chapterData });
      // To generate the chapters with table of contents
      for (const title of chapterData.contents) {
        let chapterText = await generateChapter(title, chapterData.contents);
        let chapterContent = chapterText + "\n\n";
        transcription.push(chapterContent);
      }
    }

    // To generate the book id
    const bookId = generateRandomName();

    // Save the book to a file
    // const fileName = `${bookId}_book.txt`;
    // fs.writeFileSync(`./${fileName}`, JSON.stringify(transcription));

    // // Generate individual audio files
    // const promises = transcription.map((item, idx) =>
    //   generateAudio(bookId, item, idx)
    // );
    // await Promise.all(promises);

    // Generate individual audio files sequentially
    for (let idx = 0; idx < transcription.length; idx++) {
      await generateAudio(bookId, transcription[idx], idx);
    }

    // Merge audio files
    const audioFiles = [];
    for (let i = 0; i < transcription.length; i++) {
      audioFiles.push(`./resources/${bookId}_${i}.mp3`);
    }
    await mergeAudioFiles(audioFiles, `./resources/${bookId}_final.mp3`);

    // Delete individual audio files after merging
    audioFiles.forEach((file) => {
      fs.unlinkSync(file);
    });

    return `${bookId}_final.mp3`;
  } catch (err) {
    console.log(err.message);
  }
};

const mergeAudioFiles = (inputFiles, outputFile) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    // Add input files
    inputFiles.forEach((file) => {
      command = command.input(file);
    });

    // Merge files
    command
      .on("error", (err) => {
        console.log("An error occurred: " + err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("Merging finished !");
        resolve();
      })
      .mergeToFile(outputFile);
  });
};

const generateAudio = async (filename, transcription, idx) => {
  const speechFile = path.resolve(`./resources/${filename}_${idx}.mp3`);
  const mp3 = await openai.audio.speech.create({
    model: "tts-1-hd",
    input: transcription,
    voice: "shimmer",
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
};

const generateChapter = async (topic, contents) => {
  try {
    let systemPrompt = "";
    if (contents.length > 0) {
      systemPrompt = `Please generate the text involving approximately 450 words for the below topic. It will be one of the chapters for the book. You can refer the below table of contents. Chapter numbers and titles should be written at the beginning of the text, like this:
"Chapter [number]. [title]"
You should start the text like this format.

topic: ${topic}\n\ntable of contents: ${JSON.stringify(contents)}`;
    } else {
      systemPrompt = `Please generate the text involving approximately 450 words for the below topic.
        topic: ${topic}`;
    }
    let list = [];
    list.unshift({
      role: "system",
      content: systemPrompt,
    });

    const completion = await openai.chat.completions.create({
      messages: list,
      model: "gpt-4o",
    });
    return completion.choices[0].message.content;
  } catch (err) {
    console.log(err.message);
  }
};

const getResponse = async (msgs, transcription) => {
  try {
    let list = [];
    list.unshift({
      role: "system",
      content: process.env.SYSTEM_PROMPT,
    });

    if (msgs.length > 0) {
      list.push(...msgs);
    }

    if (transcription != "") {
      list.push({
        role: "user",
        content: transcription,
      });
    }

    const completion = await openai.chat.completions.create({
      messages: list,
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.log(err);
  }
};

const getTranscription = async (fileBuffer) => {
  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    let transcription = "";

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      fileBuffer,
      {
        model: "nova-2",
        smart_format: true,
      }
    );
    if (error) {
      console.log("error----", error);
    }
    if (result) {
      transcription =
        result.results.channels[0].alternatives[0].transcript + " ";
    }

    return transcription;
  } catch (err) {
    console.log(err);
  }
};

const generateRandomName = () => {
  const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
  let code = "";
  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
};
