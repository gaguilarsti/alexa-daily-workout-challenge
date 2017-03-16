"use strict";
var APP_ID = "amzn1.ask.skill.3b461673-ee55-417c-a60c-57dbb405d485";
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
            "WELCOME_MESSAGE": "I will go through %s core exercises that you will either do for thirty seconds or do a certain number of repititions. For example, I will say, do squats for thirty seconds or do fifteen pushups. Your job is to keep up. Let's begin.",
            "TELL_EXERCISE_MESSAGE": "Exercise %s. %s ",
            "SKIP_WARMUP_MESSAGE": "Got it, let's get going.",
            "SKIP_COOLDOWN_MESSAGE": "Great work today.  Stretching is important, try to not skip it next time.",
            "WORKOUT_OVER_MESSAGE": "Great work today.  See you tomorrow.",
            "GO_MESSAGE": "Go!",
            "FIVE_REP_COUNT_MESSAGE": "One. Two. Three. Four. Five",
            "TEN_REP_COUNT_MESSAGE": "One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten.",
            "EXERCISE_COMPLETE_MESSAGE": "Good work!",
            "WARM_UP_START_MESSAGE": "Let's start with a quick warm up to loosen up your body. At any time you can skip the warmup by saying. Skip Warmup",
            "CORE_EXERCISE_START_MESSAGE": "Now that we're loosened up, let's start the main exercises. At any point, if you need a break, just say, I need a break, or, pause. If you finish an exercise early, you can also say, done, or, next exercise.",
            "COOL_DOWN_START_MESSAGE": "Great job today.  Let's do some stretching to avoid injury and be strong"
            
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
        //the complete intro audio when a new workout is started
        var speechOutput = newWorkout ? this.t("NEW_WORKOUT_MESSAGE", this.t("SKILL_NAME")) + this.t("WELCOME_MESSAGE", SESSION_LENGTH.toString()) : "";
        
        var translatedExercises = this.t("EXERCISES");
        // this is an array of the core exercises selected for the workout
        var coreExercises = populateWorkoutExercises(translatedExercises);
        // Generate a random index for the correct answer, from 0 to 3
        //var correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
        // Select and shuffle the answers for each question
        //var roundAnswers = populateRoundAnswers(gameQuestions, 0, correctAnswerIndex, translatedQuestions);
        
        var cardExercises = coreExercises.join(". ");
        
        var coreExerciseText;
        
        (function coreExercisesSpeechOutput(n) {
            coreExerciseText = coreExercises[n] + ". Go!"; 
            if (n < coreExercises.length) setTimeout(function() {
                coreExercisesSpeechOutput(++n);
            }, 3000);
        })(0);
        
        var repromptText = this.t("TELL_EXERCISE_MESSAGE", "1", coreExercises[0]);

        /*for (var i = 0; i < ANSWER_COUNT; i++) {
            repromptText += (i+1).toString() + ". " + roundAnswers[i] + ". ";
        }*/

        speechOutput += " " + coreExerciseText;

        Object.assign(this.attributes, {
            "coreExerciseText": coreExerciseText,
            "speechOutput": repromptText,
            "repromptText": repromptText,
            //"currentExerciseIndex": currentExerciseIndex,
            //"correctAnswerIndex": correctAnswerIndex + 1,
            "exercises": coreExercises
            //"score": 0,
            //"correctAnswerText": translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0]
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
    },
    "AMAZON.HelpIntent": function () {
        this.handler.state = SKILL_STATES.HELP;
        this.emitWithState("helpTheUser", false);
    },
    "AMAZON.StopIntent": function () {
        this.handler.state = SKILL_STATES.HELP;
        var speechOutput = this.t("STOP_MESSAGE");
        this.emit(":ask", speechOutput, speechOutput);
    },
    "AMAZON.CancelIntent": function () {
        this.emit(":tell", this.t("CANCEL_MESSAGE"));
    },
    "Unhandled": function () {
        var speechOutput = this.t("WORKOUT_UNHANDLED");
        this.emit(":tell", speechOutput, speechOutput);
    },
    "SessionEndedRequest": function () {
        console.log("Session ended in workout state: " + this.event.request.reason);
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

/* 
Not needed for workout - not receiving guesses from user

function handleUserGuess(userGaveUp) {
    var answerSlotValid = isAnswerSlotValid(this.event.request.intent);
    var speechOutput = "";
    var speechOutputAnalysis = "";
    var gameQuestions = this.attributes.questions;
    var correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex);
    var currentScore = parseInt(this.attributes.score);
    var currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex);
    var correctAnswerText = this.attributes.correctAnswerText;
    var translatedQuestions = this.t("QUESTIONS");

    if (answerSlotValid && parseInt(this.event.request.intent.slots.Answer.value) == this.attributes["correctAnswerIndex"]) {
        currentScore++;
        speechOutputAnalysis = this.t("ANSWER_CORRECT_MESSAGE");
    } else {
        if (!userGaveUp) {
            speechOutputAnalysis = this.t("ANSWER_WRONG_MESSAGE");
        }

        speechOutputAnalysis += this.t("CORRECT_ANSWER_MESSAGE", correctAnswerIndex, correctAnswerText);
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (this.attributes["currentQuestionIndex"] == GAME_LENGTH - 1) {
        speechOutput = userGaveUp ? "" : this.t("ANSWER_IS_MESSAGE");
        speechOutput += speechOutputAnalysis + this.t("GAME_OVER_MESSAGE", currentScore.toString(), GAME_LENGTH.toString());

        this.emit(":tell", speechOutput)
    } else {
        currentQuestionIndex += 1;
        correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
        var spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
        var roundAnswers = populateRoundAnswers.call(this, gameQuestions, currentQuestionIndex, correctAnswerIndex, translatedQuestions);
        var questionIndexForSpeech = currentQuestionIndex + 1;
        var repromptText = this.t("TELL_QUESTION_MESSAGE", questionIndexForSpeech.toString(), spokenQuestion);

        for (var i = 0; i < ANSWER_COUNT; i++) {
            repromptText += (i+1).toString() + ". " + roundAnswers[i] + ". "
        }

        speechOutput += userGaveUp ? "" : this.t("ANSWER_IS_MESSAGE");
        speechOutput += speechOutputAnalysis + this.t("SCORE_IS_MESSAGE", currentScore.toString()) + repromptText;

        Object.assign(this.attributes, {
            "speechOutput": repromptText,
            "repromptText": repromptText,
            "currentQuestionIndex": currentQuestionIndex,
            "correctAnswerIndex": correctAnswerIndex + 1,
            "questions": gameQuestions,
            "score": currentScore,
            "correctAnswerText": translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0]
        });

        this.emit(":askWithCard", speechOutput, repromptText, this.t("GAME_NAME"), repromptText);
    }
} */

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

/**
 * Get the answers for a given question, and place the correct answer at the spot marked by the
 * correctAnswerTargetLocation variable. Note that you can have as many answers as you want but
 * only ANSWER_COUNT will be selected.
 * */

/*
function populateRoundAnswers(gameQuestionIndexes, correctAnswerIndex, correctAnswerTargetLocation, translatedQuestions) {
    var answers = [];
    var answersCopy = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]][Object.keys(translatedQuestions[gameQuestionIndexes[correctAnswerIndex]])[0]].slice();
    var index = answersCopy.length;

    if (index < ANSWER_COUNT) {
        throw new Error("Not enough answers for question.");
    }

    // Shuffle the answers, excluding the first element which is the correct answer.
    for (var j = 1; j < answersCopy.length; j++){
        var rand = Math.floor(Math.random() * (index - 1)) + 1;
        index -= 1;

        var temp = answersCopy[index];
        answersCopy[index] = answersCopy[rand];
        answersCopy[rand] = temp;
    }

    // Swap the correct answer into the target location
    for (var i = 0; i < ANSWER_COUNT; i++) {
        answers[i] = answersCopy[i];
    }
    temp = answers[0];
    answers[0] = answers[correctAnswerTargetLocation];
    answers[correctAnswerTargetLocation] = temp;
    return answers;
}

function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value));
    return answerSlotIsInt && parseInt(intent.slots.Answer.value) < (ANSWER_COUNT + 1) && parseInt(intent.slots.Answer.value) > 0;
}

*/