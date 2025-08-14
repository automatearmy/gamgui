import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSession } from "@/hooks/use-sessions";

type CreateSessionModalProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateSessionModal({ children, open: controlledOpen, onOpenChange }: CreateSessionModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const navigate = useNavigate();
  const createSessionMutation = useCreateSession();
  const { user } = useAuth();

  const createSessionSchema = z.object({
    name: z.string().min(1, "Session name is required"),
    description: z.string().min(1, "Description is required"),
    session_type: z.string().optional(),
  });

  const form = useForm<CreateSessionRequest>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      name: "",
      description: "",
      session_type: "User",
    },
  });

  const isAdmin = user?.role_id === "Admin";

  const onSubmit = async (data: CreateSessionRequest) => {
    try {
      const response = await createSessionMutation.mutateAsync(data);
      if (response.success && response.data) {
        setOpen(false);
        form.reset();
        navigate(`/sessions/${response.data.id}/connect`);
      }
    }
    catch {
      // Error is handled by the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Create a new session to start working with GAM commands.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter a name for your session"
                        disabled={createSessionMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What will you use this session for?"
                        disabled={createSessionMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdmin && (
                <FormField
                  control={form.control}
                  name="session_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Type</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={createSessionMutation.isPending}
                        >
                          <ToggleGroupItem value="User">User Credentials</ToggleGroupItem>
                          <ToggleGroupItem value="Admin">Admin Credentials</ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={createSessionMutation.isPending}
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createSessionMutation.isPending ? "Creating..." : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

      </DialogContent>
    </Dialog>
  );
}
