const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ContactService {
  // 1. Naya message save karna (User ke liye)
  async createMessage(data) {
    return await prisma.contactMessage.create({
      data: {
        subject: data.subject,
        name: data.name,
        email: data.email,
        message: data.message,
      }
    });
  }

  // 2. Admin ke liye saare messages fetch karna (Pagination + Status Filter)
  async getAllMessages(page = 1, limit = 10, status = null) {
    const skip = (page - 1) * limit;
    const whereClause = status ? { status: status } : {};

    const [messages, totalCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' } // Naye pehle ayenge
      }),
      prisma.contactMessage.count({ where: whereClause })
    ]);

    return {
      messages,
      pagination: {
        totalItems: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        itemsPerPage: limit
      }
    };
  }

  // 3. Admin ke liye status update karna (UNREAD se RESOLVED etc)
  async updateMessageStatus(id, newStatus) {
    return await prisma.contactMessage.update({
      where: { id: id },
      data: { status: newStatus }
    });
  }
}

module.exports = new ContactService();