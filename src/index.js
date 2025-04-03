import { Telegraf } from "telegraf";
import { config } from "dotenv";
import { prisma } from "./config/prisma.js";
import { v4 as uuid } from "uuid";
import express from "express";
import { data, keyboard, lang, status, type } from "./config/constants.js";
import {
    canGetBonus,
    cancelMain,
    cancelTask,
    checkAccount,
    getLinks,
    updateMainBoard,
    updateTaskBoard,
} from "./utils/index.js";
import { getRemainingBonusTime } from "./utils/getRemainingBonusTime.js";

config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.webhookDomain;
const PORT = process.env.PORT || 3000;
const ADMIN = process.env.ADMIN;

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const isAdmin = (id) => [ADMIN].includes(id);
const isToday = (d1, d2) =>
    d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();
const is7DaysOrMorePast = (dateToCheck) => {
    const currentDate = new Date();
    const givenDate = new Date(dateToCheck);

    const timeDifference = currentDate - givenDate;
    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

    return timeDifference >= sevenDaysInMillis;
};

app.use(
    await bot.createWebhook({
        domain: WEBHOOK_DOMAIN,
        drop_pending_updates: true,
    })
);

app.get("/", (req, res) => {
    res.send("Bot started !!");
});

bot.start(async (ctx) => {
    const welcome_msg = await ctx.reply("Veuillez patienter… ⏳");

    const start_payload = ctx.payload;
    const user_id = ctx.from?.id.toString();

    const user = await prisma.user.findFirst({
        where: {
            userId: user_id,
        },
    });

    if (!user) {
        if (start_payload && start_payload != "ads") {
            const inviter = await prisma.user.update({
                where: {
                    userId: start_payload,
                },
                data: {
                    invitedUsers: {
                        increment: 1,
                    },
                    amount: {
                        increment: data.firstRefAmount,
                    },
                },
                select: {
                    userName: true,
                    inviterId: true,
                    userId: true,
                    withdrawalDate: true,
                },
            });

            if (inviter.inviterId) {
                const inviterId = inviter.inviterId.toString();

                const { withdrawalDate } = await prisma.user.update({
                    where: {
                        userId: inviterId,
                    },
                    data: {
                        amount: {
                            increment: data.secondRefAmount,
                        },
                    },
                    select: {
                        withdrawalDate: true,
                    },
                });

                if (!is7DaysOrMorePast(withdrawalDate || "")) {
                    await ctx.telegram.sendMessage(
                        inviterId,
                        `Bonne nouvelle ! 🎉 Un ami que vous avez invité a parrainé un joueur, vous gagnez <b>+${data.secondRefAmount} FCFA !</b> Continuez à cumuler les récompenses ! 💰🔥`,
                        {
                            parse_mode: "HTML",
                        }
                    );
                }
            }

            await ctx.reply(
                `🎉 Vous avez été invité(e) par ${inviter.userName} !`
            );

            if (!is7DaysOrMorePast(inviter.withdrawalDate || "")) {
                await ctx.telegram.sendMessage(
                    inviter.userId,
                    `Félicitations ! 🎉 Vous venez d'inviter un joueur <b>+${data.firstRefAmount} FCFA</b> sur votre compte ! Continuez à cumuler les récompenses ! 💰🔥`,
                    {
                        parse_mode: "HTML",
                    }
                );
            }
        }

        // const isMember = await checkAccount(ctx);

        const links = await getLinks();
        const start_text = lang.start(ctx.from.first_name, links);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            welcome_msg.message_id,
            undefined,
            start_text,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "✅ Vérifiez",
                                callback_data: `verify_${start_payload}`,
                            },
                        ],
                    ],
                },
                parse_mode: "HTML",
                link_preview_options: {
                    is_disabled: true,
                },
            }
        );

        return;
    }

    await ctx.reply("🎯 Invitez plus de joueurs et boostez vos gains ! 💰🚀", {
        reply_markup: {
            keyboard: keyboard.main,
            resize_keyboard: true,
        },
    });

    await ctx.deleteMessage(welcome_msg.message_id);
});

bot.command("settings", async (ctx) => {
    const user_id = ctx.from.id.toString();

    if (!isAdmin(user_id)) return;

    await ctx.reply(
        "Beinvenue sur les parametres ⚙, confugurer votre bot comme vos le voulais 🤖\n\n<b>NB: This function is still in beta phase. Please report any errors to the bot <a href='https://t.me/lex_tech'>developer</a>.</b>",
        {
            reply_markup: {
                inline_keyboard: keyboard.admin_settins,
            },
            parse_mode: "HTML",
            link_preview_options: {
                is_disabled: true,
            },
        }
    );
});

bot.on("message", async (ctx) => {
    const text = ctx.message.text;
    const user_id = ctx.from.id.toString();

    const user = await prisma.user.findUnique({
        where: {
            userId: user_id,
        },
    });

    if (!user) {
        await ctx.reply(
            "Vous n'avez pas encore de compte. Envoie /start pour cree un."
        );

        return;
    }

    if (text === "💰 Mon Solde 💰") {
        await ctx.reply(lang.account(user), {
            parse_mode: "HTML",
        });

        return;
    }

    if (text === "🔗 Inviter des Amis") {
        await ctx.reply(lang.share(ctx, user), {
            parse_mode: "HTML",
            link_preview_options: {},
        });

        return;
    }

    if (text === "Bonus 🎁") {
        if (canGetBonus(user.lastBonusDate)) {
            await prisma.user.update({
                where: {
                    userId: user_id,
                },
                data: {
                    amount: {
                        increment: data.bonusReward,
                    },
                    lastBonusDate: new Date(),
                },
            });

            await ctx.reply(lang.win, {
                parse_mode: "HTML",
            });

            return;
        }

        const { hoursRemaining, minutesRemaining, secondsRemaining } =
            getRemainingBonusTime(user.lastBonusDate);

        await ctx.reply(
            lang.bonus(hoursRemaining, minutesRemaining, secondsRemaining),
            {
                parse_mode: "HTML",
            }
        );

        return;
    }

    if (text === "📋 Procédure 📋") {
        await ctx.reply(lang.procedure, {
            parse_mode: "HTML",
        });

        return;
    }

    if (text === "💵 Retirer Mes Gains 🏦") {
        if (user.amount < data.minWithdrawal) {
            await ctx.reply(lang.min(user.amount), {
                parse_mode: "HTML",
            });

            return;
        }

        if (!user.accountNumber) {
            await ctx.reply(lang.num, {
                parse_mode: "HTML",
            });

            return;
        }

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString(),
            },
            data: {
                status: "withdraw",
            },
        });

        await ctx.reply(lang.withdrawEx, {
            parse_mode: "HTML",
        });

        return;
    }

    if (text === "📌 Ajoutez un numéro") {
        await ctx.reply(lang.settings(user), {
            reply_markup: {
                inline_keyboard: keyboard.settings(ctx),
            },
            parse_mode: "HTML",
        });

        return;
    }

    if (text === "🚩 Mes Tâches") {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to start of the day

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const lastTaskDate = new Date(user.lastTaskDate);
        let availableTasks = [];

        const currentTasks = await prisma.userTasks.findMany({
            where: {
                tgUserId: user_id,
                status: "new",
            },
        });

        if (isToday(today, lastTaskDate) && currentTasks.length == 0) {
            await ctx.reply(lang.taskComplete, {
                parse_mode: "HTML",
            });

            return;
        }

        if (isToday(today, lastTaskDate) && currentTasks.length) {
            availableTasks = await prisma.task.findMany({
                where: {
                    id: {
                        in: currentTasks.map((task) => parseInt(task.taskId)),
                    },
                },
            });
        }

        if (!isToday(today, lastTaskDate)) {
            if (currentTasks.length) {
                await prisma.userTasks.deleteMany({
                    where: {
                        tgUserId: user_id,
                        status: "new",
                    },
                });
            }

            const completedTasks = await prisma.userTasks.findMany({
                where: {
                    tgUserId: user_id,
                    status: "completed",
                },
                select: {
                    taskId: true,
                },
            });

            const completedTasksId = completedTasks.map((task) =>
                parseInt(task.taskId)
            );

            const newTasks = await prisma.task.findMany({
                where: {
                    NOT: {
                        id: {
                            in: completedTasksId,
                        },
                    },
                },
                orderBy: {
                    priority: "desc",
                },
                take: 2,
            });

            const filteredNewTasks = newTasks.filter(
                (task) => !["0", "1", "2"].includes(task.processStatus)
            );

            if (filteredNewTasks.length === 0) {
                await ctx.reply(lang.taskUnavailable, {
                    parse_mode: "HTML",
                });

                return;
            }

            await prisma.user.update({
                where: {
                    userId: user_id,
                },
                data: {
                    tasks: {
                        createMany: {
                            data: filteredNewTasks.map((task) => ({
                                taskId: task.id.toString(),
                            })),
                        },
                    },
                    lastTaskDate: new Date(),
                },
            });

            availableTasks = filteredNewTasks;
        }

        const displayTasks = availableTasks.reduce((curVal, task) => {
            return (
                curVal +
                `\n\n👉 ${task.link}\n💸 Récompense: ${task.reward} FCFA`
            );
        }, "");

        const callback_data = availableTasks.reduce((curVal, task) => {
            return curVal + `_${task.id}`;
        }, "task");

        await ctx.reply(lang.taskIntro, {
            parse_mode: "HTML",
        });

        await ctx.reply(
            `${lang.taskMain}:${displayTasks}\n\nTerminé : ${
                2 - availableTasks.length
            }/2`,
            {
                reply_markup: {
                    inline_keyboard: [[{ text: "✅ Vérifier", callback_data }]],
                },
                link_preview_options: {
                    is_disabled: true,
                },
                parse_mode: "HTML",
            }
        );
    }

    if (user?.status === "AddingNum") {
        await prisma.user.update({
            where: {
                userId: user_id,
            },
            data: {
                accountNumber: text,
                status: "Idle",
            },
        });

        await ctx.reply(lang.newNum, {
            parse_mode: "HTML",
        });

        return;
    }

    if (user?.status === "withdraw" && Boolean(parseInt(text))) {
        const withdrawAmount = parseInt(text);

        if (withdrawAmount > user.amount) {
            await ctx.reply(lang.insufficiant);

            return;
        }

        if (withdrawAmount < data.minWithdrawal) {
            await ctx.reply(lang.minText, {
                parse_mode: "HTML",
            });

            return;
        }

        if (user.invitedUsers < data.minRef) {
            await ctx.reply(lang.minUsers(user.userName, user.invitedUsers), {
                parse_mode: "HTML",
            });

            return;
        }

        await ctx.reply(lang.withdraw, {
            parse_mode: "HTML",
        });

        await prisma.user.update({
            where: {
                userId: user_id,
            },
            data: {
                status: "Idle",
                hasWithdrawn: true,
                amount: {
                    decrement: withdrawAmount,
                },
            },
        });

        const REACTIONS = [
            {
                emoji: "👍",
                type: "emoji",
            },
            {
                emoji: "🔥",
                type: "emoji",
            },
            {
                emoji: "🎉",
                type: "emoji",
            },
            {
                emoji: "❤",
                type: "emoji",
            },
        ];
        const randomNumber = Math.floor(Math.random() * 4);

        const withdrawalChannel = await prisma.channels.findFirst({
            where: {
                withdrawalChannel: true,
            },
            select: {
                tgID: true,
            },
        });

        if (!withdrawalChannel) return;

        const { tgID } = withdrawalChannel;

        const message = await ctx.telegram.sendMessage(
            tgID,
            `🎉 <b>NOUVEAU RETRAIT EFFECTUÉ !</b> 💸\n\n🔹 <b>Statut :</b> ✅ Approuvé\n🔹 <b>Identifiant :</b> ${user_id}\n<b>🔹 Retrait effectué par:</b> ${user.userName}\n<b>🔹 Montant Retiré :</b> ${withdrawAmount} FCFA 💵\n\n🔥 <b>Rejoins maintenant et commence à gagner !</b>\n\n👉 @${ctx.botInfo.username}`,
            {
                disable_notification: true,
                parse_mode: "HTML",
            }
        );

        await ctx.telegram.setMessageReaction(tgID, message.message_id, [
            REACTIONS[randomNumber],
        ]);
    }

    if (isAdmin(user_id)) {
        const forwardedMessageChannelId = ctx.message?.forward_origin?.chat?.id;
        const forwardedMessageChannelName =
            ctx.message?.forward_origin?.chat?.title;

        if (text?.startsWith("https://t.me/")) {
            const channelAdd = await prisma.channels.findFirst({
                where: {
                    processStatus: "0",
                },
            });

            if (channelAdd) {
                await prisma.channels.update({
                    where: {
                        processStatus: "0",
                    },
                    data: {
                        link: text,
                        processStatus: "1",
                    },
                });

                await ctx.reply(
                    "Transfert moi un message du canal a utilise: "
                );

                return;
            }

            const taskAdd = await prisma.task.findFirst({
                where: {
                    processStatus: "0",
                },
            });

            if (!taskAdd) return;

            await prisma.task.update({
                where: {
                    processStatus: "0",
                },
                data: {
                    link: text,
                    processStatus: "1",
                },
            });

            await ctx.reply("Transfert moi un message du canal a utilise: ");

            return;
        }

        if (forwardedMessageChannelId) {
            const channelAdd = await prisma.channels.findFirst({
                where: {
                    processStatus: "1",
                },
            });

            if (channelAdd) {
                await prisma.channels.update({
                    where: {
                        processStatus: "1",
                    },
                    data: {
                        tgID: forwardedMessageChannelId.toString(),
                        name: forwardedMessageChannelName.slice(0, 30) + "...",
                        processStatus: "2",
                    },
                });

                await ctx.reply("Do you want to force channel", {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Yes", callback_data: "forced_yes" },
                                { text: "No", callback_data: "forced_no" },
                            ],
                        ],
                    },
                });

                return;
            }

            const taskAdd = await prisma.task.findFirst({
                where: {
                    processStatus: "1",
                },
            });

            if (!taskAdd) return;

            await prisma.task.update({
                where: {
                    processStatus: "1",
                },
                data: {
                    chatId: forwardedMessageChannelId.toString(),
                    processStatus: "2",
                },
            });

            await ctx.reply(
                "Plus qu'une dernier etape pour ajoute votre lien.Veillez repondre a la question\n\nVotre le lien est avec demande d'adhesion",
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Oui", callback_data: "link_yes" },
                                { text: "Non", callback_data: "link_no" },
                            ],
                        ],
                    },
                }
            );

            return;
        }

        return;
    }
});

bot.on("chat_join_request", async (ctx) => {
    const user_id = ctx.from.id.toString();
    const channel_id = ctx.chatJoinRequest.chat.id.toString();

    const user = await prisma.joinRequests.findFirst({
        where: {
            channelId: channel_id,
            userId: user_id,
        },
    });

    if (user) return;

    await prisma.joinRequests.create({
        data: {
            channelId: channel_id,
            userId: user_id,
        },
    });
});

bot.on("callback_query", async (ctx) => {
    const callback_data = ctx.callbackQuery.data;
    const user_id = ctx.from.id.toString();
    const [command, payload] = callback_data.split("_");

    if (command === "verify") {
        const isMember = await checkAccount(ctx);

        if (!isMember) {
            await ctx.reply(lang.invalid);

            return;
        }

        await prisma.user.create({
            data: {
                userId: user_id,
                userName: ctx.from.first_name,
                inviterId: payload != "ads" ? payload.toString() : "",
                lastBonusDate: new Date(2000, 11, 1),
                botID: data.botID,
            },
        });

        await ctx.reply(lang.welcome, {
            reply_markup: {
                keyboard: keyboard.main,
                resize_keyboard: true,
            },
        });

        await ctx.deleteMessage();

        return;
    }

    if (command === "addNum") {
        await ctx.reply(lang.getNum, {
            parse_mode: "HTML",
        });

        await prisma.user.update({
            where: {
                userId: user_id,
            },
            data: {
                status: "AddingNum",
            },
        });
    }

    if (command === "task") {
        const completedTasks = [];
        const uncompletedTasksId = [];
        const availableTasks = [];

        for (const payload of callback_data.split("_").slice(1)) {
            const task = await prisma.task.findUnique({
                where: {
                    id: parseInt(payload),
                },
            });

            if (!task) {
                await ctx.reply(
                    "Une erreur s’est produite, veuillez réessayer demain."
                );

                await ctx.deleteMessage();

                return;
            }

            let taskCompleted = false;

            if (task.type == type.JOIN) {
                const done = await prisma.joinRequests.findFirst({
                    where: {
                        userId: user_id,
                        channelId: task.chatId,
                    },
                });

                if (done) {
                    await prisma.userTasks.update({
                        where: {
                            taskId_tgUserId: {
                                taskId: payload,
                                tgUserId: user_id,
                            },
                        },
                        data: {
                            status: status.COMPLETED,
                        },
                    });

                    taskCompleted = true;
                }
            }

            if (task.type == type.PUBLIC) {
                const { status } = await ctx.telegram.getChatMember(
                    task.chatId,
                    user_id
                );

                if (status != "left" && status != "kicked") {
                    await prisma.userTasks.update({
                        where: {
                            taskId_tgUserId: {
                                taskId: payload,
                                tgUserId: user_id,
                            },
                        },
                        data: {
                            status: status.COMPLETED,
                        },
                    });

                    taskCompleted = true;
                }
            }

            if (taskCompleted) {
                completedTasks.push({ id: task.id, reward: task.reward });
            } else {
                uncompletedTasksId.push(task.id);
                availableTasks.push(task);
            }
        }

        if (completedTasks.length === 0) {
            await ctx.answerCbQuery(lang.taskAlert, {
                show_alert: true,
            });

            return;
        }

        const totalReward = completedTasks.reduce(
            (sum, { reward }) => sum + reward,
            0
        );
        const completedTasksId = completedTasks.map((task) =>
            task.id.toString()
        );

        await prisma.user.update({
            where: {
                userId: user_id,
            },
            data: {
                amount: {
                    increment: totalReward,
                },
                tasks: {
                    updateMany: {
                        where: {
                            tgUserId: user_id,
                            taskId: {
                                in: completedTasksId,
                            },
                        },
                        data: {
                            status: "completed",
                        },
                    },
                },
            },
        });

        if (
            completedTasks.length === callback_data.split("_").slice(1).length
        ) {
            await ctx.deleteMessage();
            await ctx.reply(lang.taskDone, {
                parse_mode: "HTML",
            });

            return;
        }

        const remainingTask = availableTasks.filter(
            (task) => !completedTasks.includes(task.id.toString())
        );

        const displayTasks = remainingTask.reduce((curVal, task) => {
            return (
                curVal +
                `\n\n👉 ${task.link}\n💸 Récompense: ${task.reward} FCFA`
            );
        }, "");

        const command = uncompletedTasksId.reduce((curVal, taskId) => {
            return curVal + `_${taskId}`;
        }, "task");

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            ctx.callbackQuery.message.message_id,
            undefined,
            `${lang.taskMain}: ${displayTasks}\n\nTerminé: ${completedTasksId.length}/2`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ Vérifier", callback_data: command }],
                    ],
                },
                link_preview_options: {
                    is_disabled: true,
                },
                parse_mode: "HTML",
            }
        );
    }

    // Display edit channel info data
    if (command === "edit") {
        const channel = await prisma.channels.findUnique({
            where: {
                id: payload,
            },
        });

        const message = `Nom: ${channel.name}\n\nLien: ${
            channel.link
        }\n\nType: ${channel.type === "main" ? "Canal obligatoire" : "Tache"}`;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            ctx.callbackQuery.message.message_id,
            undefined,
            message,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Modifier",
                                callback_data: `channelEdit_${channel.id}`,
                            },
                            {
                                text: "Supprime",
                                callback_data: `channelDelete_${channel.id}`,
                            },
                        ],
                        [
                            {
                                text: "Canal De Retrait",
                                callback_data: `change_${channel.id}`,
                            },
                        ],
                        [
                            {
                                text: "🔙 Retour",
                                callback_data:
                                    channel.type === "main"
                                        ? "back_main"
                                        : "back_tasks",
                            },
                        ],
                    ],
                },
                link_preview_options: {
                    is_disabled: true,
                },
            }
        );
    }

    if (command === "editTask") {
        const channel = await prisma.task.findUnique({
            where: {
                id: payload,
            },
        });

        const message = `Lien: ${channel.link}\n\nType: ${
            channel?.type === "main" ? "Canal obligatoire" : "Tache"
        }`;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            ctx.callbackQuery.message.message_id,
            undefined,
            message,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Modifier",
                                callback_data: `channelEditTask_${channel.id}`,
                            },
                            {
                                text: "Supprime",
                                callback_data: `channelDeleteTask_${channel.id}`,
                            },
                        ],
                        [
                            {
                                text: "🔙 Retour",
                                callback_data: "back_tasks",
                            },
                        ],
                    ],
                },
                link_preview_options: {
                    is_disabled: true,
                },
            }
        );
    }

    // Edit a specific channel info
    if (command === "channelEdit") {
        await prisma.channels.update({
            where: {
                id: payload,
            },
            data: {
                processStatus: "0",
            },
        });

        await ctx.reply("Envoie moi le lien du nouveau canal...");
    }

    if (command === "channelEditTask") {
        await prisma.task.update({
            where: {
                id: payload,
            },
            data: {
                processStatus: "0",
            },
        });

        await ctx.reply("Envoie moi le lien du nouveau canal... : ");

        return;
    }

    // Delete a channel
    if (command === "channelDelete") {
        await prisma.channels.delete({
            where: {
                id: payload,
            },
        });

        await ctx.answerCbQuery("Le canal a etait supprime", {
            show_alert: false,
        });

        await updateMainBoard(ctx);
    }

    if (command === "channelDeleteTask") {
        await prisma.task.delete({
            where: {
                id: payload,
            },
        });

        await ctx.answerCbQuery("Le canal a etait supprime", {
            show_alert: false,
        });

        await updateTaskBoard(ctx);

        return;
    }

    if (callback_data === "settings_main" || callback_data === "back_main") {
        await updateMainBoard(ctx);
    }

    if (callback_data === "settings_tasks" || callback_data === "back_tasks") {
        await updateTaskBoard(ctx);
    }

    if (callback_data === "settings_add_main") {
        await cancelMain();

        await prisma.channels.create({
            data: {
                processStatus: "0",
                type: "main",
            },
        });

        await ctx.reply("Envoie moi le lien du canal a ajoute");
    }

    if (callback_data === "settings_add_task") {
        await cancelTask();

        await prisma.task.create({
            data: {
                processStatus: "0",
                type: "tas",
            },
        });

        await ctx.reply("Envoie moi le lien du canal a ajoute");
    }

    if (callback_data === "back_settings") {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            ctx.callbackQuery.message.message_id,
            undefined,
            "Beinvenue sur les parametres ⚙, confugurer votre bot comme vos le voulais 🤖",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Main", callback_data: "settings_main" },
                            { text: "Tasks", callback_data: "settings_tasks" },
                        ],
                    ],
                },
            }
        );
    }

    if (callback_data === "link_yes" || callback_data === "forced_no") {
        const channelAdd = await prisma.channels.findFirst({
            where: {
                processStatus: "2",
            },
        });

        if (channelAdd) {
            await prisma.channels.update({
                where: {
                    processStatus: "2",
                },
                data: {
                    joinRequest: true,
                    processStatus: uuid(),
                },
            });

            await ctx.reply("Votre lien a etait ajoute avec sucess !!");

            return;
        }

        const taskAdd = await prisma.task.findFirst({
            where: {
                processStatus: "2",
            },
        });

        if (!taskAdd) return;

        await prisma.task.update({
            where: {
                processStatus: "2",
            },
            data: {
                joinRequest: true,
                type: type.JOIN,
                reward: 150,
                priority: 5,
                processStatus: uuid(),
            },
        });

        await ctx.editMessageReplyMarkup({
            inline_keyboard: [],
        });

        await ctx.reply("Votre lien a etait ajoute avec sucess !!");
    }

    if (callback_data === "link_no" || callback_data === "forced_yes") {
        const channelAdd = await prisma.channels.findFirst({
            where: {
                processStatus: "2",
            },
        });

        if (channelAdd) {
            try {
                const botStatus = await ctx.telegram.getChatMember(
                    channelAdd.tgID,
                    ctx.botInfo.id
                );

                if (
                    botStatus.status !== "administrator" &&
                    !botStatus.can_invite_users
                ) {
                    await ctx.reply(
                        "Verifier que le bot sois admins avec la permission d'ajoute des nouveau membre. Puis reessayer"
                    );

                    return;
                }
            } catch (error) {
                console.log(error);

                await ctx.reply(
                    "Verifier que le bot sois admins et reessayer.\n\nSi le probleme persist contacte le dev."
                );

                return;
            }

            await prisma.channels.update({
                where: {
                    processStatus: "2",
                },
                data: {
                    joinRequest: false,
                    processStatus: uuid(),
                },
            });

            await ctx.reply("Votre lien a etait ajoute avec sucess !!");

            return;
        }

        const taskAdd = await prisma.task.findFirst({
            where: {
                processStatus: "2",
            },
        });

        if (!taskAdd) return;

        await prisma.task.update({
            where: {
                processStatus: "2",
            },
            data: {
                joinRequest: false,
                reward: 150,
                priority: 5,
                processStatus: uuid(),
                type: type.PUBLIC,
            },
        });

        await ctx.editMessageReplyMarkup({
            inline_keyboard: [],
        });

        await ctx.reply("Votre lien a etait ajoute avec sucess !!");
    }

    // Edit withdrawal channel
    if (command === "change") {
        const withdrawChannel = await prisma.channels.findFirst({
            where: {
                id: payload,
            },
            select: {
                name: true,
                link: true,
                id: true,
            },
        });

        await ctx.reply(
            `By clicking Continue the withdrawal channel will be change to:\n\n👉 <a href="${withdrawChannel?.link}">${withdrawChannel?.name}</a>`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Continue",
                                callback_data: `continue_${withdrawChannel?.id}`,
                            },
                            { text: "Cancel", callback_data: "cancel" },
                        ],
                    ],
                },
                link_preview_options: {
                    is_disabled: true,
                },
            }
        );
    }

    if (command === "continue") {
        const oldWithDrawChannel = await prisma.channels.findFirst({
            where: {
                withdrawalChannel: true,
            },
            select: {
                id: true,
            },
        });

        await prisma.channels.update({
            where: {
                id: payload,
            },
            data: {
                withdrawalChannel: true,
            },
        });

        oldWithDrawChannel?.id &&
            (await prisma.channels.update({
                where: {
                    id: oldWithDrawChannel.id,
                },
                data: {
                    withdrawalChannel: false,
                },
            }));

        await ctx.editMessageReplyMarkup({
            inline_keyboard: [],
        });

        await ctx.reply("Withdrawal channel change...");
    }

    if (callback_data === "cancel") {
        await ctx.editMessageReplyMarkup({
            inline_keyboard: [],
        });

        await ctx.answerCbQuery("WTF !! Don't disturb...", {
            show_alert: true,
            cache_time: 1000,
        });
    }
});

bot.catch(async (err, ctx) => {
    await ctx.telegram.sendMessage(ADMIN, `${err}\n\n${new Date()}`);

    console.log(err);
});

// bot.launch(() => {
//     console.log("bot started");
// });

app.listen(PORT, () => {
    console.log("Listening to port", PORT);
});
