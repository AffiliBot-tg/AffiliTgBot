import { prisma } from "../config/prisma.js";

export const cancelMain = async () => {
    const isCreating = await prisma.channels.findFirst({
        where: {
            processStatus: {
                in: ["0", "1", "2"],
            },
        },
    });

    if (isCreating) {
        await prisma.channels.delete({
            where: {
                id: isCreating.id,
            },
        });
    }

    return Boolean(isCreating);
};

export const cancelTask = async () => {
    const isCreating = await prisma.task.findFirst({
        where: {
            processStatus: {
                in: ["0", "1", "2"],
            },
        },
    });

    if (isCreating) {
        await prisma.task.delete({
            where: {
                id: isCreating.id,
            },
        });
    }

    return Boolean(isCreating);
};
