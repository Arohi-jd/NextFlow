const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const workflows = await prisma.workflow.findMany({ take: 10 });
    console.log(`\nFound ${workflows.length} workflows in database\n`);

    workflows.forEach((w) => {
      const nodeCount = Array.isArray(w.nodes) ? w.nodes.length : 0;
      const edgeCount = Array.isArray(w.edges) ? w.edges.length : 0;
      console.log(`ID: ${w.id}`);
      console.log(`Name: ${w.name}`);
      console.log(`Nodes: ${nodeCount}, Edges: ${edgeCount}`);
      console.log(`Created: ${w.createdAt}\n`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
