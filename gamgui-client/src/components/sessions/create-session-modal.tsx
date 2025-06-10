import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
      await createSessionMutation.mutateAsync(data);
      setOpen(false);
      reset();
    }
    catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
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
