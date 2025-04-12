import { formatLinks, formatNumbers } from "../utils/index.js";

export const data = {
    firstRefAmount: 500,
    secondRefAmount: 250,
    bonusReward: 150,
    minWithdrawal: 10000,
    minRef: 5,
    botID: "init",
};

export const status = {
    NEW: "new",
    COMPLETED: "completed",
};

export const type = {
    PUBLIC: "public",
    JOIN: "join",
};

export const keyboard = {
    main: [
        [{ text: "💰 Mon Solde 💰" }, { text: "🔗 Inviter des Amis" }],
        [{ text: "Bonus 🎁" }, { text: "🚩 Mes Tâches" }],
        [{ text: "💵 Retirer Mes Gains 🏦" }],
        [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }],
    ],
    settings(ctx) {
        return [
            [
                {
                    text: "Ajouter/Modifier",
                    callback_data: `addNum_${ctx.from.id}`,
                },
            ],
        ];
    },
    admin_settins: [
        [
            { text: "Main", callback_data: "settings_main" },
            { text: "Tasks", callback_data: "settings_tasks" },
        ],
    ],
};

export const lang = {
    welcome:
        "🎉 Félicitations ! Votre compte est activé ! 🚀\n\n💰 Prêt à gagner de l’argent facilement ? Cliquez sur '📋 Procédure 📋' pour découvrir comment booster vos gains dès maintenant ! 💸",
    invalid:
        "⚠️ Attention ! Vous devez rejoindre tous les canaux pour creé votre compte et commencer à gagner ! 🔓✅",
    win: `🎊 Bravo ! Vous venez de recevoir un bonus de ${data.bonusReward} FCFA ! 💰\n\n🔥 Continuez à inviter et accumulez encore plus de gains ! 🚀`,
    procedure: `💡 Comment gagner de l'argent avec AffiliBot ?\n\n1️⃣ Clique sur <b>‘🔗 Inviter des Amis’</b>\n2️⃣ Copie ton lien unique 📎\n3️⃣ Partage-le avec tes amis sur Telegram, WhatsApp et Facebook ! 📢\n\n🎯 Tu gagnes ${data.firstRefAmount} FCFA par ami invité !\n💰 Et ${data.secondRefAmount} FCFA pour chaque personne qu’il invite !\n\n<b>🔥 Plus tu partages, plus tu gagnes !</b> Commence dès maintenant ! 🚀`,
    minText: `🚫 Vous devez atteindre un minimum de <b>${formatNumbers(
        data.minWithdrawal
    )} FCFA</b> pour effectuer un retrait. Continuez à inviter pour y arriver rapidement ! 🔥`,
    min(amount) {
        const remainingPersons = Math.ceil(
            (data.minWithdrawal - amount) / data.firstRefAmount
        );

        return `🚫 Le retrait est possible à partir de <b>${formatNumbers(
            data.minWithdrawal
        )} FCFA</b>.\n\n📢 Invitez encore <b>${remainingPersons} personne(s)</b> ou <b>complete des tâches</b> pour débloquer votre retrait et recevoir votre argent ! 💸`;
    },
    num: "📌 <b>Ajoutez votre numéro de retrait pour recevoir vos gains !</b>\n\nCliquez sur ‘📌 Ajouter un numéro’ et sécurisez vos futurs paiements.",
    withdrawEx:
        "💰 Entrez le montant que vous souhaitez retirer\n\nExemple : <b>10500 FCFA</b>",
    newNum: "✅ <b>Succès !</b> Votre numéro de retrait a été enregistré ! 🎉\n\nVous pouvez maintenant demander un retrait en toute sécurité. 🚀",
    insufficiant:
        "⚠️ Solde insuffisant !\n\nVeuillez entrer un montant inférieur à votre solde disponible ou continuez à inviter des amis pour augmenter vos gains ! 📈",
    withdraw:
        "🎊 <b>Félicitations !</b> Votre demande de retrait a été prise en compte ! 💰\n\n🔄 <b>Délai de traitement :</b> 3 à 5 jours.\n📢 <b>Astuce :</b> Continuez à inviter des utilisateurs pour accélérer votre priorité ! 🚀",
    getNum: "📌 <b>Entrez le numéro du compte où vous souhaitez recevoir votre paiement.</b>",
    taskIntro:
        "🎯 <b>Bienvenue dans le menu des tâches !</b>\n\nAccomplissez des missions et gagnez encore plus d’argent facilement ! 💰🚀",
    taskMain:
        "📢 <b>Rejoignez ces canaux, puis cliquez sur ‘✅ Vérifier’ pour débloquer votre bonus instantanément !</b>",
    taskUnavailable:
        "😕 Aucune tâche disponible pour le moment.\n\n🔄 Revenez plus tard pour de nouvelles opportunités de gain ! 💰",
    taskComplete:
        "🎉 Vous avez complété toutes les tâches du jour !\n\n📅 Revenez demain pour gagner encore plus ! 🚀",
    taskDone:
        "✅ <b>Mission accomplie !</b> Vous avez gagné votre bonus !\n\n📆 Revenez demain pour plus d’opportunités de gain. 💰🔥",
    taskAlert:
        "⚠️ Action requise ! Vous devez compléter les tâches pour avancer ! 🚀",
    minUsers(userName, invitedUsers) {
        return `⚠️ Désolé <b>${userName}</b>, votre retrait a été refusé. 😔\n\n📌 Vous devez inviter au moins <b>${data.minRef} personnes</b> pour débloquer votre premier retrait.\n\n👥 <b>Nombre d'invités actuels :</b> ${invitedUsers} ❌\n\n📢 <b>Invitez plus d’amis</b> en partageant votre lien pour débloquer votre argent ! 💰🚀`;
    },
    share(ctx, user) {
        return `💸 <b>Gagne de l'argent facilement avec AffiliBot !</b>🚀\n\n🎯 <b>Ton lien de parrainage unique :</b>\n🔗 https://t.me/${
            ctx.botInfo.username
        }?start=${
            ctx.from.id
        }\n\n👥 <b>Tes statistiques :</b>\n- 👤 Amis invités : ${
            user.invitedUsers
        }\n- 💰 Solde actuel : ${formatNumbers(
            user.amount
        )} FCFA\n\n🔥 <b>Gains :</b>\n- 500 FCFA par ami direct invité ✅\n- 250 FCFA pour chaque ami invité par tes amis 🔥\n\n📌 <b>Retrait possible dès ${formatNumbers(
            data.minWithdrawal
        )} FCFA !</b> 💰\n\n📢 <b>Partage ce lien maintenant et commence à gagner !</b>🚀💸`;
    },
    account(user) {
        return `👤 <b>Nom :</b> ${user.userName}\n\n💰 <b>Solde Actuel :</b> ${
            user.amount
        } FCFA\n\n📈 <b>Astuce :</b> Invite plus d’amis et augmente tes gains ! 🚀\n\n📌 <b>Retrait possible dès ${formatNumbers(
            data.minWithdrawal
        )} FCFA !</b> 💸`;
    },
    settings(user) {
        return `⚙️ <b>Paramètres du compte :</b>\n\n👤 <b>Nom :</b> ${user.userName}\n🆔 <b>ID :</b> ${user.userId}\n💳 <b>Numéro de retrait :</b> ${user.accountNumber}\n\n📌 <b>Ce numéro sera utilisé pour recevoir tes paiements. </b>\n\n🔽 Clique ci-dessous pour le modifier si nécessaire.`;
    },
    start(first_name, links) {
        return `Bienvenue <b>${first_name}</b> sur AffiliBot, 🚀\n\nJe peux vous faire gagner jusqu’à 150 000 FCFA 💰 par mois.\n\nPour commencer, vous devez rejoindre tous mes canaux. 📲\n\n${formatLinks(
            links
        )}`;
    },
    bonus(hours, mins, secs) {
        return `🚀 <b>Bonus déjà attribué !</b>\n\n⏳ <b>Reviens dans</b> ${hours} heure(s) ${mins} minutes ${secs} secondes pour réclamer ton prochain bonus gratuit ! 🎁`;
    },
};
