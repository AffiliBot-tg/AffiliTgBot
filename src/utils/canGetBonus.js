export const canGetBonus = (lastBonusDate) => {
    let difference = new Date() - new Date(lastBonusDate);

    let differenceInHours = difference / 1000 / 60 / 60;

    return differenceInHours >= 2;
};
