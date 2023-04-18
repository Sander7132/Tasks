const verifier = require('@gradeup/email-verify');

const verifyEmail = email => new Promise((resolve, reject) => {
    verifier.verify(email, (err, info) => {
        console.log(err, info);
        if (err) {
            reject(JSON.stringify(info));
        } else {
            resolve(info);
        }
    });
});

const tryToParseJson = jsonString => {
    try {
        return JSON.parse(jsonString);
    } catch {
        return false;
    }
};

module.exports = {tryToParseJson, verifyEmail};
