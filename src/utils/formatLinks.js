export const formatLinks = (links) => {
    return links.reduce((prev, link) => prev + `👉 ${link}\n\n`, "");
};
