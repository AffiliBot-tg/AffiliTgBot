import { prisma } from "../config/prisma.js";

export const updateMainBoard = async (ctx) => {
    let CHANNELS = await prisma.channels.findMany({
        where: {
            type: "main",
            processStatus: {
                notIn: ["0", "1", "2"],
            },
        },
        select: {
            name: true,
            id: true,
            withdrawalChannel: true,
        },
    });

    const nonWithdrawalChannel = CHANNELS.filter(
        (channel) => !channel.withdrawalChannel
    );

    const withdrawalChannel = CHANNELS.filter(
        (channel) => channel.withdrawalChannel
    );

    CHANNELS = [...nonWithdrawalChannel, ...withdrawalChannel];

    const message = "Les canaux abligatoire";

    const keyboard = CHANNELS.map((channel) => [
        {
            text: `${channel.name}${channel.withdrawalChannel ? "🤑" : ""}`,
            callback_data: `edit_${channel.id}`,
        },
    ]);

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        undefined,
        message,
        {
            reply_markup: {
                inline_keyboard: [
                    ...keyboard,
                    [
                        {
                            text: "Ajoute un canal",
                            callback_data: "settings_add_main",
                        },
                    ],
                    [{ text: "🔙 Retour", callback_data: "back_settings" }],
                ],
            },
        }
    );
};

export const updateTaskBoard = async (ctx) => {
    const CHANNELS = await prisma.task.findMany({
        where: {
            processStatus: {
                notIn: ["0", "1", "2"],
            },
        },
        orderBy: {
            priority: "desc",
        },
    });

    const message = "Vos taches !!";

    const keyboard = CHANNELS.map((channel) => [
        {
            text: channel.link,
            callback_data: `editTask_${channel.id}`,
        },
    ]);

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        undefined,
        message,
        {
            reply_markup: {
                inline_keyboard: [
                    ...keyboard,
                    [
                        {
                            text: "Ajoute une tache",
                            callback_data: "settings_add_task",
                        },
                    ],
                    [{ text: "🔙 Retour", callback_data: "back_settings" }],
                ],
            },
        }
    );
};
