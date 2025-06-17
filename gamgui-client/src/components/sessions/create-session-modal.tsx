import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import type { CreateSessionRequest } from "@/types/session";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSession } from "@/hooks/use-sessions";

type CreateSessionModalProps = {
  children: React.ReactNode;
};

export function CreateSessionModal({ children }: CreateSessionModalProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const createSessionMutation = useCreateSession();

  const createSessionSchema = z.object({
    name: z.string().min(1, "Session name is required"),
    description: z.string().min(1, "Description is required"),
    domain: z.string().min(1, "Domain is required"),
    timeout_minutes: z.number().min(1, "Minimum timeout is 1 minute").max(480, "Maximum timeout is 480 minutes"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSessionRequest>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      timeout_minutes: 60,
    },
  });

  const onSubmit = async (data: CreateSessionRequest) => {
    try {
      const response = await createSessionMutation.mutateAsync(data);
      if (response.success && response.data) {
        setOpen(false);
        reset();
        navigate(`/sessions/${response.data.id}`);
      }
    }
    catch {
      // Error is handled by the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {createSessionMutation.isPending && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground font-medium">
                Creating session, please wait...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" data-1p-ignore>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              Create a new session to start working on your project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                placeholder="Enter session name"
                disabled={createSessionMutation.isPending}
                autoComplete="organization"
                data-1p-ignore
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter session description"
                disabled={createSessionMutation.isPending}
                autoComplete="off"
                data-1p-ignore
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                disabled={createSessionMutation.isPending}
                autoComplete="url"
                data-1p-ignore
                {...register("domain")}
              />
              {errors.domain && (
                <p className="text-sm text-red-600">{errors.domain.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeout_minutes">Timeout (minutes)</Label>
              <Input
                id="timeout_minutes"
                type="number"
                min="1"
                max="480"
                disabled={createSessionMutation.isPending}
                autoComplete="off"
                data-1p-ignore
                {...register("timeout_minutes", { valueAsNumber: true })}
              />
              {errors.timeout_minutes && (
                <p className="text-sm text-red-600">{errors.timeout_minutes.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createSessionMutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? "Creating..." : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
