"use strict";
var APP_ID = "amzn1.ask.skill.3b461673-ee55-417c-a60c-57dbb405d485";

//Google Analytics
var ua = require('universal-analytics');

var SESSION_LENGTH = 5;  // The number of questions per trivia game.
var SKILL_STATES = {
    WORKOUT: "_WORKOUT", // Reading exercises.
    START: "_STARTMODE", // Entry point, start the workout.
    HELP: "_HELPMODE" // The user is asking for help.
};
var exercises = require("./exercises");
var cooldown = require("./cooldown");
var warmup = require("./warmup");


var languageString = {
    "en-US": {
        "translation": {
            "EXERCISES" : exercises["EXERCISES_EN_US"],
            "WARMUP" : warmup["WARMUPS_EN_US"],
            "COOLDOWN" : cooldown["COOLDOWNS_EN_US"],
            "SKILL_NAME" : "Daily Workout Challenge", 
            "HELP_MESSAGE": "I will go through a series of exercises that you will either do for thirty seconds or do a certain number of repititions. For example, I will say do squats for thirty seconds or do fifteen pushups.  To start a new workout at any time, say, start workout. ",
            "REPEAT_EXERCISE_MESSAGE": "To repeat the last exercise, say, repeat. ",
            "ASK_MESSAGE_START": "Would you like to start working out?",
            "HELP_MESSAGE_REPROMPT": "To advance through the workout, simply do each exercise and try to keep up.",
            "STOP_MESSAGE": "Would you like to keep going?",
            "CANCEL_MESSAGE": "Ok, let's workout again soon.",
            "NO_MESSAGE": "Ok, we'll get after it another time. Goodbye!",
            "HELP_UNHANDLED": "Say yes to continue, or no to end the workout.",
            "START_UNHANDLED": "Say start to start a new workout.",
            "WORKOUT_UNHANDLED": "Sorry, I didn'nt quite get that.",
            "NEW_WORKOUT_MESSAGE": "Welcome to %s. ",
            "WELCOME_MESSAGE": "I will go through %s core exercises that you will either do for thirty seconds or do a certain number of repititions within thrity seconds. For example, I will say, do squats for thirty seconds or do fifteen pushups. Your job is to keep up. Let's begin.",
            "TELL_EXERCISE_MESSAGE": "Exercise %s. %s ",
            "SKIP_WARMUP_MESSAGE": "Got it, let's get going.",
            "SKIP_COOLDOWN_MESSAGE": "Great work today.  Stretching is important, try to not skip it next time.",
            "WORKOUT_COMPLETE_MESSAGE": "Your workout is complete! Great work today. See you tomorrow.",
            "GO_MESSAGE": "Go!",
            "MID_POINT_MESSAGE": "Half way there",
            "FIFTEEN_SECOND_TIMER_SSML": "<break time=\"10s\" /><break time=\"5s\" />",
            "TEN_SECOND_TIMER_SSML": "<break time=\"10s\" />",
            "FIVE_SEC_COUNTDOWN_SSML": "<p>Five</p><p>Four</p><p>Three</p><p>Two</p><p>One</p>",
            "EXERCISE_COMPLETE_MESSAGE": "Good work!",
            "WARM_UP_START_MESSAGE": "Let's start with a quick warm up to loosen up your body. At any time you can skip the warmup by saying. Skip Warmup",
            "CORE_EXERCISE_START_MESSAGE": "Now that we're loosened up, let's start the main exercises. At any point, if you need a break, just say, I need a break, or, pause. If you finish an exercise early, you can also say, done, or, next exercise.",
            "COOL_DOWN_START_MESSAGE": "Great job today.  Let's do some stretching to avoid injury and be strong",
            "EXERCISE_COMPLETE_MESSAGE": "Good work. Next exercise"
            
        }
    }
};

var Alexa = require("alexa-sdk");
var APP_ID = "amzn1.ask.skill.3b461673-ee55-417c-a60c-57dbb405d485";  

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageString;
    alexa.registerHandlers(newSessionHandlers, startStateHandlers, workoutStateHandlers, helpStateHandlers);
    alexa.execute();
};

var newSessionHandlers = {
    "LaunchRequest": function () {
        this.handler.state = SKILL_STATES.START;
        this.emitWithState("StartWorkout", true);
    },
    "AMAZON.StartOverIntent": function() {
        this.handler.state = SKILL_STATES.START;
        this.emitWithState("StartWorkout", true);
    },
    "AMAZON.HelpIntent": function() {
        this.handler.state = SKILL_STATES.HELP;
        this.emitWithState("helpTheUser", true);
    },
    "Unhandled": function () {
        var speechOutput = this.t("START_UNHANDLED");
        this.emit(":ask", speechOutput, speechOutput);
    }
};



var startStateHandlers = Alexa.CreateStateHandler(SKILL_STATES.START, {
    "StartWorkout": function (newWorkout) {
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("success", speechOutput).send();
        
        //the complete intro audio when a new workout is started
        var speechOutput = newWorkout ? this.t("NEW_WORKOUT_MESSAGE", this.t("SKILL_NAME")) + this.t("WELCOME_MESSAGE", SESSION_LENGTH.toString()) : "";
        
        var translatedExercises = this.t("EXERCISES");
        // this is an array of the core exercises selected for the workout
        var coreExercises = populateWorkoutExercises(translatedExercises);
        
        var cardExercises = coreExercises.join(". ");
        
        var coreExerciseText = [];
        
        for (var k = 0; k < coreExercises.length; k++) {
            if (k != coreExercises.length - 1) {
                coreExerciseText.push(coreExercises[k] + ". " + this.t("GO_MESSAGE") + this.t("FIFTEEN_SECOND_TIMER_SSML") + this.t("MID_POINT_MESSAGE") + this.t("TEN_SECOND_TIMER_SSML") + this.t("FIVE_SEC_COUNTDOWN_SSML") + this.t("EXERCISE_COMPLETE_MESSAGE"));
            } else {
                coreExerciseText.push(coreExercises[k] + ". " + this.t("GO_MESSAGE") + this.t("FIFTEEN_SECOND_TIMER_SSML") + this.t("MID_POINT_MESSAGE") + this.t("TEN_SECOND_TIMER_SSML") + this.t("FIVE_SEC_COUNTDOWN_SSML"));
            }
        }
        
        var coreExerciseSpeechOutput = coreExerciseText.join(". ") + this.t("WORKOUT_COMPLETE_MESSAGE");
        
        var repromptText = this.t("TELL_EXERCISE_MESSAGE", "1", coreExercises[0]);

        speechOutput += " " + coreExerciseSpeechOutput;

        Object.assign(this.attributes, {
            "coreExerciseText": coreExerciseText,
            "speechOutput": speechOutput,
            "repromptText": repromptText,
            "exercises": coreExercises
        });

        // Set the current state to workout mode. The skill will now use handlers defined in workoutStateHandlers
        this.handler.state = SKILL_STATES.WORKOUT;
        this.emit(":askWithCard", speechOutput, this.t("SKILL_NAME"));
    }
});

var workoutStateHandlers = Alexa.CreateStateHandler(SKILL_STATES.WORKOUT, {
    "AMAZON.StartOverIntent": function () {
        this.handler.state = SKILL_STATES.START;
        this.emitWithState("StartWorkout", false);
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("StartOverIntent", "success").send();
    },
    "AMAZON.HelpIntent": function () {
        this.handler.state = SKILL_STATES.HELP;
        this.emitWithState("helpTheUser", false);
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("HelpIntent", "success").send();
    },
    "AMAZON.StopIntent": function () {
        this.handler.state = SKILL_STATES.HELP;
        var speechOutput = this.t("STOP_MESSAGE");
        this.emit(":ask", speechOutput, speechOutput);
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("StopIntent", "success").send();
    },
    "AMAZON.CancelIntent": function () {
        this.emit(":tell", this.t("CANCEL_MESSAGE"));
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("CancelIntent", "success").send();
    },
    "Unhandled": function () {
        var speechOutput = this.t("WORKOUT_UNHANDLED");
        this.emit(":tell", speechOutput, speechOutput);
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("UnHandled", "success").send();
    },
    "SessionEndedRequest": function () {
        console.log("Session ended in workout state: " + this.event.request.reason);
        //declaring the intentTrackingID's Google Tracking ID
        var intentTrackingID = ua('UA-93829613-1');
        //report a success
        intentTrackingID.event("SessionEndRequest", "success").send();
    }
});

var helpStateHandlers = Alexa.CreateStateHandler(SKILL_STATES.HELP, {
    "helpTheUser": function (newWorkout) {
        var askMessage = newWorkout ? this.t("ASK_MESSAGE_START") : this.t("REPEAT_EXERCISE_MESSAGE") + this.t("STOP_MESSAGE");
        var speechOutput = this.t("HELP_MESSAGE", SESSION_LENGTH) + askMessage;
        var repromptText = this.t("HELP_REPROMPT") + askMessage;
        this.emit(":ask", speechOutput, repromptText);
    },
    "AMAZON.StartOverIntent": function () {
        this.handler.state = SKILL_STATES.START;
        this.emitWithState("StartGame", false);
    },
    "AMAZON.RepeatIntent": function () {
        var newWorkout = (this.attributes["speechOutput"] && this.attributes["repromptText"]) ? false : true;
        this.emitWithState("helpTheUser", newWorkout);
    },
    "AMAZON.HelpIntent": function() {
        var newWorkout = (this.attributes["speechOutput"] && this.attributes["repromptText"]) ? false : true;
        this.emitWithState("helpTheUser", newWorkout);
    },
    "AMAZON.YesIntent": function() {
        if (this.attributes["speechOutput"] && this.attributes["repromptText"]) {
            this.handler.state = SKILL_STATES.WORKOUT;
            this.emitWithState("AMAZON.RepeatIntent");
        } else {
            this.handler.state = SKILL_STATES.START;
            this.emitWithState("StartGame", false);
        }
    },
    "AMAZON.NoIntent": function() {
        var speechOutput = this.t("NO_MESSAGE");
        this.emit(":tell", speechOutput);
    },
    "AMAZON.StopIntent": function () {
        var speechOutput = this.t("STOP_MESSAGE");
        this.emit(":ask", speechOutput, speechOutput);
    },
    "AMAZON.CancelIntent": function () {
        this.emit(":tell", this.t("CANCEL_MESSAGE"));
    },
    "Unhandled": function () {
        var speechOutput = this.t("HELP_UNHANDLED");
        this.emit(":ask", speechOutput, speechOutput);
    },
    "SessionEndedRequest": function () {
        console.log("Session ended in help state: " + this.event.request.reason);
    }
});

function populateWorkoutExercises(translatedExercises) {
    var workoutExercises = [];
    var indexList = [];
    var index = translatedExercises.length;

    if (SESSION_LENGTH > index){
        throw new Error("Invalid Game Length.");
    }

    for (var i = 0; i < translatedExercises.length; i++){
        indexList.push(translatedExercises[i]);
    }

    // Pick SESSION_LENGTH random exercises from the list to have the user do, make sure there are no repeats.
    for (var j = 0; j < SESSION_LENGTH; j++){
        var rand = Math.floor(Math.random() * index);
        index -= 1;

        var temp = indexList[index];
        indexList[index] = indexList[rand];
        indexList[rand] = temp;
        workoutExercises.push(indexList[index]);
    }

    return workoutExercises;
}
