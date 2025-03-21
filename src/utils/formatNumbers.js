export const formatNumbers = (num) => {
    if (num >= 10000) return num.toLocaleString();

    return num.toString();
};
