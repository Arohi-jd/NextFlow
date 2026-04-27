import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas";
import { getOrCreateUser } from "@/lib/helpers/getOrCreateUser";
import { prisma } from "@/lib/prisma";
import type { NodeData, WorkflowRun } from "@/lib/types";

type WorkflowPageProps = {
  params: {
    id: string;
  };
};

function mapRun(run: {
  id: string;
  workflowId: string;
  status: string;
  scope: string;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  executions: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    inputs: unknown;
    outputs: unknown;
    error: string | null;
    executionTime: number | null;
    startedAt: Date;
    completedAt: Date | null;
  }>;
}): WorkflowRun {
  return {
    id: run.id,
    workflowId: run.workflowId,
    status: run.status as WorkflowRun["status"],
    scope: run.scope,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    duration: run.duration,
    executions: run.executions.map((execution) => ({
      id: execution.id,
      nodeId: execution.nodeId,
      nodeType: execution.nodeType,
      status: execution.status as WorkflowRun["executions"][number]["status"],
      inputs: (execution.inputs as Record<string, unknown> | null) ?? null,
      outputs: (execution.outputs as Record<string, unknown> | null) ?? null,
      error: execution.error,
      executionTime: execution.executionTime,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt?.toISOString() ?? null
    }))
  };
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser();

  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        include: {
          executions: {
            orderBy: { id: "asc" }
          }
        }
      }
    }
  });

  if (!workflow || workflow.userId !== user.id) {
    redirect("/workflow");
  }

  const updatedWorkflow = await prisma.workflow.update({
    where: { id: workflow.id },
    data: { lastOpenedAt: new Date() }
  });

  return (
    <section className="h-screen min-h-screen bg-[var(--bg-primary)]">
      <ReactFlowProvider>
        <WorkflowCanvas
          workflowId={workflow.id}
          workflowName={updatedWorkflow.name}
          initialNodes={((Array.isArray(workflow.nodes) ? workflow.nodes : []) as unknown) as Node<NodeData>[]}
          initialEdges={((Array.isArray(workflow.edges) ? workflow.edges : []) as unknown) as Edge[]}
          initialRuns={workflow.runs.map(mapRun)}
        />
      </ReactFlowProvider>
    </section>
  );
}
