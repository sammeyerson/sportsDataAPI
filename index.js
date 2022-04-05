const PORT = process.env.PORT || 8000
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
//inititalizing globals
var gameData = [];
var bettingData = [];
var props = {};

//importing constants
const {URL_NBA, URL_UFC, nbaTeams, leagues, lineupSource} = require('./constants');

//establishing current date-time


//cant import functions because global vars
//not using currently but could use again
const nbaTeamNameToAbbreviation = (teamName) => {
  if (teamName.includes('L.A.')) {
    teamName = teamName.split(" ")[1]
    teamName = "Los Angeles " + teamName
  }
  var nbaTeam = nbaTeams.find(team => team.teamName === teamName)
  return nbaTeam.abbreviation;
}

  const getDateTime = () => {
  var currentdate = new Date();
  var hour = currentdate.getHours();
  /*
  if (hour < 4){

      hour = hour + 20;
  }
  else {
      hour = hour - 4;
  }*/
  var minute = currentdate.getMinutes();
  if (minute < 10) {
    minute = "0" + minute;
  }
  datetime = (currentdate.getMonth() + 1) + "/"
    + currentdate.getDate() + "/"
    + currentdate.getFullYear() + " "
    + hour + ":"
    + minute + ":" +
    currentdate.getSeconds();
}

getDateTime();


  const leagueData = async (team, events, path) => {
  //initializing vars
  var event;
  var description;
  var returnReturnVals = [];
  
  if (path == 'NBA') {
    for (var i = 0, n = events.length; i < n; i++) {
      var returnVals = [];
      event = events[i];

      //getting game date-time from link
      var link = event.link;
      link = link.split("-");
      startTime = link[link.length - 1];
      var startYear = startTime.slice(0, 4);
      var startMonth = startTime.slice(4, 6);
      var startDate = startTime.slice(6, 8);
      var startTime = startTime.slice(8, 10) + ":" + startTime.slice(10, 12);
      if (startTime.substring(0, 2) > 12) {
        startTime = (startTime.substring(0, 2) - 12) + startTime.substring(2);
      }
      var startTime = startTime + " ET " + startMonth + "/" + startDate + "/" + startYear;
      
      var isLive = event.live;
      description = event.description;
      
      var displayGroup = event.displayGroups[0];

      //only looking at game lines, TODO: player props
      if (displayGroup.description == "Game Lines") {
        var markets = displayGroup.markets;
        var homeMoneyLine = 0;
        var awayMoneyLine = 0;
        
        for (var b = 0, e = markets.length; b < e; b++) {
          var market = markets[b];
          var descriptionBetType = market.description;
          var descriptionPeriod = market.period.description;
          var outcomes = market.outcomes;

          //full game spread
          if (descriptionBetType == 'Point Spread' && descriptionPeriod == 'Game') {
            var spread1 = 0, spread2 = 0;
            var team1, team2;
            var favoriteSpread = 0;
            var favoriteTeam;

            for (var c = 0, f = outcomes.length; c < f; c++) {
              var outcome = outcomes[c];
              var outcomeTeam = outcome.description;
              var prices = outcome.price;
              var handicap = parseFloat(prices.handicap);
              var odds = prices.american;
              
              if (handicap > 0) {
                handicap = "+" + handicap.toString();
              }
              
              if (c == 0) {
                spread1 = handicap;
                team1 = outcomeTeam;
              } else {
                spread2 = handicap;
                team2 = outcomeTeam;
              }

              //finding favorite and dog
              if (c > 0 && spread1 < 0) {
                favoriteSpread = spread1;
                favoriteTeam = team1;
                underdogSpread = spread2;
                underdogTeam = team2;

              } else if (c > 0 && spread1 >= 0) {
                favoriteSpread = spread2;
                favoriteTeam = team2;
                underdogSpread = spread1;
                underdogTeam = team1;
              }
            }
          }
          //full game total
          if (descriptionBetType == 'Total' && descriptionPeriod == 'Game') {
            var total1 = 0;

            for (var c = 0, f = outcomes.length; c < f; c++) {
              var outcome = outcomes[c];
              var outcomeTeam = outcome.description;
              var prices = outcome.price;
              total1 = prices.handicap;
              if (c == 0) {
                team1Total = outcomeTeam;
              } else {
                team2Total = outcomeTeam;
              }
            }
          }

          //full game money lines
          if (descriptionBetType == 'Moneyline' && descriptionPeriod == 'Game') {
            homeMoneyLine = 'n/a';
            awayMoneyLine = 'n/a';
            for (var c = 0, f = outcomes.length; c < f; c++) {
              var outcome = outcomes[c];
              var outcomeTeam = outcome.description;
              var moneyLine = outcome.price.american;
              var homeTeam = description.split(' @ ')[1];
              var awayTeam = description.split(' @ ')[0];
              
              if (outcomeTeam == homeTeam) {
                homeMoneyLine = moneyLine;
              } else if (outcomeTeam == awayTeam) {
                awayMoneyLine = moneyLine;
              }
            }
          }
        }

        if (isLive == true) {
          favoriteTeam = 'n/a - game live';
        } else {
          for (var x = 0, z = nbaTeams.length; x < z; x++) {
            var tempName = nbaTeams[x].teamName.toLowerCase()
            //console.log(event)
            if (tempName.includes(favoriteTeam.split(" ")[favoriteTeam.split(" ").length - 1].toLowerCase())) {
              favoriteTeam = nbaTeams[x].abbreviation;
            }
          }
        }

        if (team.toLowerCase() == 'nba') {
          if (isLive == true) {

            returnVals.spread = 'n/a - game live'
            returnVals.total = 'n/a - game live'
            returnVals.homeMoneyLine = 'n/a - game live'
            returnVals.awayMoneyLine = 'n/a - game live'
          } else {
            returnVals.spread = favoriteTeam + ' ' + favoriteSpread
            returnVals.total = total1
            returnVals.homeMoneyLine = homeMoneyLine
            returnVals.awayMoneyLine = awayMoneyLine
          }
          returnVals.startTime = startTime


          if (!returnReturnVals.includes(returnVals)) {
            returnReturnVals.push(returnVals)
          }
        } else if (homeTeam.toLowerCase().includes(team.toLowerCase()) || awayTeam.toLowerCase().includes(team.toLowerCase())) {
          if (isLive == true) {

            returnVals.spread = 'n/a - game live'
            returnVals.total = 'n/a - game live'
            returnVals.homeMoneyLine = 'n/a - game live'
            returnVals.awayMoneyLine = 'n/a - game live'
          } else {
            returnVals.spread = favoriteTeam + ' ' + favoriteSpread
            returnVals.total = total1
            returnVals.homeMoneyLine = homeMoneyLine
            returnVals.awayMoneyLine = awayMoneyLine
          }
          returnVals.startTime = startTime

          if (!returnReturnVals.includes(returnVals)) {
            returnReturnVals.push(returnVals)
          }
        }

      }
      
    }

  }
  return returnReturnVals;
}


 const getDataLeague = (team) => new Promise(async (resolve) => {
  //source: bovada
  const axios = require("axios");
  var html = await axios.get(URL_NBA);
  var data = html.data;
  var returnVals = [];

  for (var i = 0, n = data.length; i < n; i++) {
    var path = data[i].path;
    path = path[0].description;
    //does path include a league such as NBA, NFL, etc. If not we don't want to look at it
    var result = leagues.some(w => path.includes(w))
    //also excluding futures and special bets
    if (result && !path.includes('Special') && !path.includes('Future') && !path.includes('(E)') && !path.includes('Props')) {
      var events = data[i].events;
      for (var a = 0, b = events.length; a < b; a++) {
        var isItALeague = true;
        if (isItALeague) {
          returnVals = await leagueData(team, events, path);
          bettingData = returnVals;
        }
        if (returnVals.length > 0) {
          bettingData = returnVals;
          break;
        }
      }
    }
  }
  //in case we never entered for loop for whatever reason (issue on their end)
  bettingData = returnVals;
  resolve();
})



 const getDataNBAGame =  (team) => new Promise(async (resolve) => {
  //source: bovada
  const axios = require("axios");
  var html = await axios.get(URL_NBA);

  //pulling all basketball events off bovada
  var data = html.data[0];
  var path = data.path;
  path = path[0].description;
  var events = data.events;

  bettingData = await leagueData(team, events, path);

  resolve();

})

 const retrieveStarters = (team) => new Promise( async (resolve) => {
  //source: basketball monster
    await axios.get(lineupSource)
      .then(response => {
        const html = response.data
        const $ = cheerio.load(html)
        var hasNumber = /\d/;

        //looking at every html table of class "datatable"
        $("table[class='datatable']", html).each(function (i, elem) {
          //initializing a whole buncha vars
          var lineupVerified = false;
          var isFinal = false;
          var isLive = false;
          var gameHeader = $(elem).find('thead > tr:nth-child(1) > th').text();
          var awayStarters = [];
          var homeStarters = [];
          var awayTeam = $(elem).find('thead > tr:nth-child(2) > th:nth-child(2)').text().replace(/\s+/g, '')
          var homeTeam = $(elem).find('thead > tr:nth-child(2) > th:nth-child(3)').text().replace(/\s+/g, '').replace('@', '')
          var homeTeamScore = 'n/a';
          var awayTeamScore = 'n/a';
          try {
            for (var i = 0, n = homeTeam.length; i < n; i++) {
              if (hasNumber.test(homeTeam[i])) {
                isLive = true;
                homeTeamScore = homeTeam.substring(i, homeTeam.length)
                homeTeam = homeTeam.substring(0, i)
                throw 'Live Game';
              }
            }
          } catch (e) {
            console.log(e)
          }
          try {
            for (var i = 0, n = awayTeam.length; i < n; i++) {
              if (hasNumber.test(awayTeam[i])) {
                isLive = true;
                awayTeamScore = awayTeam.substring(i, awayTeam.length)
                awayTeam = awayTeam.substring(0, i)

                throw 'Live Game';
              }
            }
          } catch (e) {
            console.log(e)
          }

          if (gameHeader.includes('Final')) {
            isFinal = true;
            isLive = false;
          }

          //every team has 5 starters
          for (var i = 0; i < 5; i++) {
            var lineupVerified = false;
            var awayPlayer = $(elem).find('tbody > tr:nth-child(' + (i + 1) + ') > td:nth-child(2) > a').text()
            var awayPlayerInjury = $(elem).find('tbody > tr:nth-child(' + (i + 1) + ') > td:nth-child(2) > span')

            if (awayPlayerInjury.length > 0) {
              awayPlayer = awayPlayer + ' (' + awayPlayerInjury.attr('title').split(' (Injury)')[0] + ')'
            }
            awayStarters.push(awayPlayer)
            var homePlayer = $(elem).find('tbody > tr:nth-child(' + (i + 1) + ') > td:nth-child(3) > a').text()
            var homePlayerInjury = $(elem).find('tbody > tr:nth-child(' + (i + 1) + ') > td:nth-child(3) > span')

            if (homePlayerInjury.length > 0) {
              homePlayer = homePlayer + '  (' + homePlayerInjury.attr('title').split(' (Injury)')[0] + ')'
            }
            homeStarters.push(homePlayer)
            var tdTag = $(elem).find('tbody > tr:nth-child(' + (i + 1) + ') > td:nth-child(3)')
            if (tdTag.hasClass('verified')) {
              lineupVerified = true;
            }
          }

          //getting starters for all teams
          if (team == 'all') {
            gameData.push({
              homeTeam,
              awayTeam,
              isLive,
              isFinal,
              homeTeamScore,
              awayTeamScore,
              lineupVerified,
              homeStarters,
              awayStarters

            })
          } 
          //getting starters for one game
           else if (homeTeam.toLowerCase() == team.toLowerCase() || awayTeam.toLowerCase() == team.toLowerCase()) {
            gameData.push({
              homeTeam,
              awayTeam,
              isLive,
              isFinal,
              homeTeamScore,
              awayTeamScore,
              lineupVerified,
              homeStarters,
              awayStarters
            })
          }
        })
        resolve();
      })
})



const getDataUFCOdds = (team) => new Promise(async (resolve) => {
  //source: bovada
  const axios = require("axios");
  var html = await axios.get(URL_UFC);

  var data = html.data;
  var gameDataItt = 0;
  props = {};
  for (var a = 0, z = data.length; a < z; a++) {

    //resetting value in case it's not found on subsequent pass
    var description = '';

    //getting each mma event listed on bovada
    var events = data[a].events;
    var eventDescription = data[a].path[0].description;

    //only looking at UFC PPVs and fight nights
    if ((eventDescription.includes('2') || eventDescription.includes('Fight Night') || eventDescription.includes('vs')) && eventDescription.includes('UFC')) {

      //adding event to array of data
      gameData.push({
        eventDescription
      });
      var eventFights = [];

      for (var i = 0, n = events.length; i < n; i++) {


        var event = events[i];

        //description is 'fighter1 vs fighter2'
        description = event.description;

        //getting odds
        var displayGroup = event.displayGroups;
        var fightOdds = displayGroup[0]
        var propositions = displayGroup[1]

        var outcomes = fightOdds.markets[0].outcomes;
        var fighter1 = 'n/a';
        var moneyLine1 = 0;
        var fighter2 = 'n/a';
        var moneyLine2 = 0;
        for (var b = 0, c = outcomes.length; b < c; b++) {
          var outcome = outcomes[b];
          if (b == 0) {
            //should never have more than 2 listed fighters but you never know, they could mess up
            fighter1 = outcome.description;
            moneyLine1 = outcome.price.american;
          } else {
            fighter2 = outcome.description;
            moneyLine2 = outcome.price.american;
          }
        }

        //adding key of 'fighter1 vs fighter2' in props object which will store all props for every fight
        //'fighter1 vs fighter2' should always be unique key
        props[description] = []

        //undefined means props aren't listed yet
        if (propositions != undefined) {

          var propMarkets = propositions.markets;

          for (var p = 0, s = propMarkets.length; p < s; p++) {
            var propDescription = propMarkets[p].description;
            //temp object to store one fights props
            var propSub = {};

            //adding key of prop description - usually something like "Method of Victory" or "Total Rounds Over/Under"
            //keys should be unique per fight
            propSub[propDescription] = [];

            var propOutcomes = propMarkets[p].outcomes;

            for (var r = 0, t = propOutcomes.length; r < t; r++) {
              //temp object for each individual prop per fight
              var propIndividual = {
                description: propOutcomes[r].description,
                handicap: propOutcomes[r].price.handicap,
                price: propOutcomes[r].price.american
              }
              //storing each prop in one fight
              propSub[propDescription].push(propIndividual);

            }
            //storing all props for each fight in each event
            props[event.description].push(propSub)
          }
        }
        eventFights.push({
          description,
          fighter1,
          moneyLine1,
          fighter2,
          moneyLine2
        })
      }
      gameData[gameDataItt].fights = eventFights
      gameDataItt += 1;
    }
  }

  resolve();
})

app.get('/', (req, res) => {
  res.json('Welcome lifeform. Append nba or ufc to url to get all availabe data for respective league.')
})

app.get('/nba', async (req, res) => {
  //getting data for all nba games
  //resetting globals
  gameData = [];
  bettingData = [];


  getDateTime();

  await getDataLeague('nba');

  await retrieveStarters('all');


  for (var i = 0, n = gameData.length; i < n; i++) {
    var homeTeam = gameData[i].homeTeam;
    var awayTeam = gameData[i].awayTeam;
    //getting betting data for every game
    for (var a = 0, b = bettingData.length; a < b; a++) {
      var gameInfo = bettingData[a];
      var teamName = gameInfo.spread.split(' ')[0];
      if (homeTeam == teamName || awayTeam == teamName) {
        gameData[i].startTime = gameInfo.startTime;
        gameData[i].spread = gameInfo.spread
        gameData[i].total = gameInfo.total
        gameData[i].homeMoneyLine = gameInfo.homeMoneyLine
        gameData[i].awayMoneyLine = gameInfo.awayMoneyLine
        gameData[i].bettingDataSource = 'Bovada'
        gameData[i].lastUpdate = datetime
      }
    }
  }
  console.log('NBA data retrieved: ' + datetime)
  res.json(gameData)
})

app.get('/nba/:team', async (req, res) => {
  //getting data for team's game
  //team input can be abbreviation(MIA), simple name(Heat), or city name(Miami)
  var team = req.params.team;

  //resetting globals
  gameData = [];
  bettingData = [];

  //setting date-time
  getDateTime();

  //validating input, any input under 3 characters shouldn't be a team name
  //'no' could be new orleans so checking for that
  if(team=='no'){
    team='NOP';
  }
  if (team.length < 3) {
    res.json("No value. Team parameter must be at least 3 characters.");
  } else {
    //getting simple name of input team: MIA -> Heat, LAL -> Lakers, etc
    for (var x = 0, n = nbaTeams.length; x < n; x++) {
      var nbaTeam = nbaTeams[x];
      for (var key of Object.keys(nbaTeam)) {
        if (key != "teamId") {
          if (nbaTeam[key].toLowerCase().includes(team.toLowerCase())) {
            team = nbaTeam.simpleName;
          }
        }
      }
    }

    await getDataNBAGame(team);

    //getting abbreviation of input team: Heat -> MIA, Indiana -> IND
    for (var x = 0, n = nbaTeams.length; x < n; x++) {
      var nbaTeam = nbaTeams[x];
      for (var key of Object.keys(nbaTeam)) {
        if (key != "teamId") {
          if (nbaTeam[key].toLowerCase().includes(team.toLowerCase())) {
            team = nbaTeam.abbreviation;
          }
        }
      }
    }

    await retrieveStarters(team);

    //adding betting data to gameData object
    for (var i = 0, n = gameData.length; i < n; i++) {
      var homeTeam = gameData[i].homeTeam;
      var awayTeam = gameData[i].awayTeam;
      for (var a = 0, b = bettingData.length; a < b; a++) {
        var gameInfo = bettingData[a];
        var teamName = gameInfo.spread.split(' ')[0];
        if (homeTeam == teamName || awayTeam == teamName) {
          gameData[i].startTime = gameInfo.startTime;
          gameData[i].spread = gameInfo.spread
          gameData[i].total = gameInfo.total
          gameData[i].homeMoneyLine = gameInfo.homeMoneyLine
          gameData[i].awayMoneyLine = gameInfo.awayMoneyLine
          gameData[i].bettingDataSource = 'Bovada'
          gameData[i].lastUpdate = datetime
        }
      }
    }
    console.log('NBA data retrieved: ' + datetime)
    res.json(gameData)
  }

})

app.get('/ufc', async (req, res) => {
  //getting all ufc events listed on bovada with odds

  //resetting globals
  gameData = [];
  bettingData = [];

  //setting date-time
  getDateTime();

  //awaiting promise from async function fetching json data
  await getDataUFCOdds('ufc');

  console.log('UFC data retrieved: ' + datetime)

  for (var i = 0, n = gameData.length; i < n; i++) {
    var fights = gameData[i].fights

    for (var a = 0; a < fights.length; a++) {
      var fightDescription = fights[a].description;
      var propsForFight = props[fightDescription]
      gameData[i].fights[a].props = propsForFight
      //adding prop bets to each fight
    }
  }
  //gameData format: event -> fight -> fighter names, odds to win, props
  res.json(gameData)
})

app.listen(PORT, () => console.log(`server running on PORT ${PORT}`))
