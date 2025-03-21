export const getRemainingBonusTime = (lastBonusDate) => {
    let givenTime = new Date(lastBonusDate);
    let currentTime = new Date();

    let timePlusThreeHour = new Date(givenTime.getTime() + 3600000 * 2);

    let timeRemaining = timePlusThreeHour - currentTime;

    let hoursRemaining = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    let minutesRemaining = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );
    let secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    return {
        hoursRemaining,
        minutesRemaining,
        secondsRemaining,
    };
};
