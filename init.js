const config = require('./package.json').myConfig
const client = require("async-redis").createClient(config.redisPort, config.redisHost);

async function init(){

    await client.hmset("song_1", "name", "Like a Rolling Stone", "musician", "Bob Dylan")
    await client.hmset("song_2", "name", "(I Can't Get No) Satisfaction", "musician", "The Rolling Stones")
    await client.hmset("song_3", "name", "Imagine", "musician", "John Lennon")
    await client.hmset("song_4", "name", "What's Going On", "musician", "Marvin Gaye")

    await client.sadd("songs", 1, 2, 3, 4)

    await client.set("stats/songs:1/total", 100)
    await client.set("stats/songs:1/2019", 100)
    await client.set("stats/songs:1/201901", 100)
    await client.set("stats/songs:1/20190101", 100)

    await client.set("stats/songs:2/total", 50)
    await client.set("stats/songs:2/2019", 50)
    await client.set("stats/songs:2/201901", 50)
    await client.set("stats/songs:2/20190101", 50)

    await client.quit()
    console.log('Done')
}

init()