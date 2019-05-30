const config = require('./package.json').myConfig
const client = require("async-redis").createClient(config.redisPort, config.redisHost);
const app = require("express")();
const dayjs = require("dayjs");

app.set("view engine", "pug");

app.get("/", async function(req, res){

  let songs = [];

  try{
    const keys = await client.smembers("songs")
    for(const key of keys)
    {
      const song = await client.hgetall("song_" + key)
      song.key = key
      songs.push(song)
    }

    res.render('index', { songs })
  }
  catch (err) {
    res.render('error', { message: err.message })
  }

})

app.get("/songs/:id", async function(req, res) {
  const songId = req.params.id;

  try {
    const song = await client.hgetall(`song_${songId}`);
    await client.sadd("songs", songId);
    await client.incr(`stats/songs:${songId}/${dayjs().format("YYYYMMDD")}`);
    await client.incr(`stats/songs:${songId}/${dayjs().format("YYYYMM")}`);
    await client.incr(`stats/songs:${songId}/${dayjs().format("YYYY")}`);
    await client.incr(`stats/songs:${songId}/total`);

    const views = await client.get(`stats/songs:${songId}/total`);

    res.render('song', { song, views });
  } catch (err) {
    res.render('error', { message: err.message })
  }
});

app.get("/stats", async function(req, res) {
  try {
    const sorted = await client.sort(
      "songs",
      "by",
      "stats/songs:*/total",
      "limit",
      0,
      5,
      "get",
      "song_*->name",
      "get",
      "song_*->musician",
      "get",
      "stats/songs:*/total",
      "desc"
    );
    const labels = [];
    const data = [];
    for (let i = 0; i < sorted.length; i += 3) {
      labels.push(sorted[i])
      data.push(sorted[i + 2] ? parseInt(sorted[i + 2]) : 0)

    }
    
    res.render('stats/index', { labels, data })

  } catch (err) {
    res.render('error', { message: err.message })
  }
});

app.get("/stats/date", async function(req, res) {

  const date = req.query.date || dayjs().format("YYYYMMDD");
  const type = req.query.type || "day";

  let data = [];
  const format =
    type === "day" ? "YYYYMMDD" : type === "month" ? "YYYYMM" : "YYYY";

  try {
    const sorted = await client.sort(
      "songs",
      "by",
      `stats/songs:*/${dayjs(date).format(format)}`,
      "limit",
      0,
      5,
      "get",
      "song_*->name",
      "get",
      "song_*->musician",
      "get",
      `stats/songs:*/${dayjs(date).format(format)}`,
      "desc"
    );

    const labels = [];
    const data = [];
    for (let i = 0; i < sorted.length; i += 3) {
      labels.push(sorted[i])
      data.push(sorted[i + 2] ? parseInt(sorted[i + 2]) : 0)

    }
    
    res.render('stats/date', { type, labels, data, date: dayjs(date).format('YYYY-MM-DD') })
  } catch (err) {
    res.render('error', { message: err.message })
  }
});

app.get("/stats/songs/:id", async function(req, res) {
  let begin =
    req.query.begin ||
    dayjs()
      .set("date", 1)
      .format("YYYYMMDD");
  let end = req.query.end || dayjs().format("YYYYMMDD");
  const type = req.query.type || "day";
  const songId = req.params.id;

  end = dayjs(end).add(1, type);

  let data = [];
  let labels = [];
  const format =
    type === "day" ? "YYYYMMDD" : type === "month" ? "YYYYMM" : "YYYY";

  const dformat =
    type === "day" ? "YYYY-MM-DD" : type === "month" ? "YYYY-MM" : "YYYY";

  try {
    for (
      let date = dayjs(begin);
      date.isBefore(end);
      date = date.add(1, type)
    ) {
      const view = await client.get(
        `stats/songs:${songId}/${date.format(format)}`
      );
      data.push(
        view ? parseInt(view) : 0
      );
      labels.push(date.format(dformat))
    }

    const song = await client.hgetall(`song_${songId}`)

    res.render('stats/song', { type, labels, data, song, begin: dayjs(begin).format('YYYY-MM-DD'), end: dayjs(end).subtract(1, type).format('YYYY-MM-DD') })

  } catch (err) {
    res.render('error', { message: err.message })
  }
});

app.listen(3000, function() {
  console.log("server running at port 3000");
});
