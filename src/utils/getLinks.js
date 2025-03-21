import { prisma } from "../config/prisma.js";

export async function getLinks() {
    let channels = await prisma.channels.findMany({
        where: {
            type: "main",
            processStatus: {
                notIn: ["0", "1", "2"],
            },
        },
        select: {
            link: true,
        },
    });

    return channels.map((channel) => channel.link);
}
