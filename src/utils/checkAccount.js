import { prisma } from "../config/prisma.js";

export async function checkAccount(ctx) {
    const channels = await prisma.channels.findMany({
        where: {
            type: "main",
            joinRequest: false,
            processStatus: {
                notIn: ["0", "1", "2"],
            },
        },
        select: {
            tgID: true,
            link: true,
        },
    });

    // channels = [
    //     ...CHANNELS,
    //     {
    //         tgID: "-1002279447886",
    //     },
    // ];

    let isMember = true;

    for (const channel of channels) {
        const user = await ctx.telegram.getChatMember(
            channel.tgID,
            ctx.from.id
        );

        if (user.status == "left" || user.status == "kicked") {
            isMember = false;

            break;
        }
    }

    return isMember;
}
