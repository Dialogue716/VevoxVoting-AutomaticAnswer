// ==UserScript==
// @name         Vevox Voting Automatic Answer Script
// @namespace    https://github.com/Dialogue716/VevoxVoting-AutomaticAnswer
// @version      1.7
// @description  Automatically get the Vevox poll answer page question + option, and call Azure OpenAI GPT-4o mini Api to automatically answer
// @author       天才只是见我的门槛
// @match        *://*.vevox.app/*
// @grant        GM_xmlhttpRequest
// @connect      vevox.openai.azure.com
// ==/UserScript==

(function () {
    'use strict';

    let observer;
    let lastQuestion = null;
    let scriptStartTime, apiCallStartTime, apiCallEndTime;

    function main() {
        scriptStartTime = performance.now();
        const { question, options } = getQuestionAndOptions();
        if (question && question !== lastQuestion) {
            console.log('Find a new question:', question);
            lastQuestion = question;

            const combinedText = `${question},options is:${options.join(', ')}`;
            apiCallStartTime = performance.now();
            getAnswerFromAzureOpenAI(combinedText).then(processAnswer).finally(showExecutionTime);
        }
    }

    function getQuestionAndOptions() {
        const questionElement = document.querySelector('h2[data-testid="question-title"]');
        const optionElements = document.querySelectorAll('p.py-4.wrapchoices.pr-4');
        const options = Array.from(optionElements).map(el => el.innerText.trim());

        return {
            question: questionElement ? questionElement.innerText.trim() : null,
            options: options
        };
    }

    async function getAnswerFromAzureOpenAI(question) {
        const endpoint = 'Your Azure Endpoint';
        const apiKey = 'Your Azure Api';

        const messages = [
            { role: 'user', content: `Question: ${question}\ Return only correct option` }
        ];

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: endpoint,
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey
                },
                data: JSON.stringify({
                    model: 'gpt-4o-mini', //gpt model of your choice
                    messages: messages,
                    temperature: 0.7
                }),
                onload: function (response) {
                    apiCallEndTime = performance.now();
                    if (response.status === 200) {
                        const result = JSON.parse(response.responseText);
                        const answer = result.choices[0].message.content.trim();
                        resolve(answer);
                    } else {
                        console.error('Failed to get an answer from Azure OpenAI', response);
                        reject(response);
                    }
                },
                onerror: function (error) {
                    apiCallEndTime = performance.now();
                    console.error('An error occurred while requesting:', error);
                    reject(error);
                }
            });
        });
    }

    function processAnswer(answer) {
        console.log('Answers from Azure OpenAI:', answer);
        const matchedOption = matchAnswerWithOptions(answer);
        clickOption(matchedOption);
    }

    function matchAnswerWithOptions(answer) {
        const options = document.querySelectorAll('p.py-4.wrapchoices.pr-4');
        let matchedOption = null;

        options.forEach(option => {
            if (answer.includes(option.innerText.trim())) {
                matchedOption = option;
            }
        });

        return matchedOption;
    }

    function clickOption(optionElement) {
        if (optionElement) {
            optionElement.click();
            console.log('The correct answer was automatically selected:', optionElement.innerText);
        } else {
            console.error('No matching option was found');
        }
    }

    window.onload = function () {
        waitForQuestion();
    };

    function waitForQuestion() {
        observer = new MutationObserver((mutations, obs) => {
            main();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function showExecutionTime() {
        const scriptEndTime = performance.now();
        const totalExecutionTime = (scriptEndTime - scriptStartTime).toFixed(2);
        const apiExecutionTime = apiCallEndTime ? (apiCallEndTime - apiCallStartTime).toFixed(2) : 'N/A';
        console.log(`Total script running time: ${totalExecutionTime} ms`);
        console.log(`Azure OpenAI API Call time: ${apiExecutionTime} ms`);
    }
})();
