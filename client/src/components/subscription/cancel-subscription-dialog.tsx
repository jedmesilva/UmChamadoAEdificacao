import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Ban, Pause, Clock } from "lucide-react";

interface CancelSubscriptionDialogProps {
  subscriptionId: number;
  stripeSubscriptionId: string;
  type: "email" | "physical";
  onSuccess: () => void;
}

const pausePeriods = [
  { value: "30", label: "30 dias (1 mês)", description: "Pausa por 1 mês" },
  { value: "60", label: "60 dias (2 meses)", description: "Pausa por 2 meses" },
  { value: "90", label: "90 dias (3 meses)", description: "Pausa por 3 meses" },
  { value: "180", label: "180 dias (6 meses)", description: "Pausa por 6 meses" },
  { value: "cancel", label: "Cancelar definitivamente", description: "Encerrar assinatura permanentemente" },
];

export default function CancelSubscriptionDialog({
  subscriptionId,
  stripeSubscriptionId,
  type,
  onSuccess,
}: CancelSubscriptionDialogProps) {
  const [selectedOption, setSelectedOption] = useState("30");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAction = async () => {
    setIsLoading(true);

    try {
      let response;

      if (selectedOption === "cancel") {
        // Cancelar a assinatura definitivamente
        response = await apiRequest("POST", "/api/stripe/cancel-subscription", {
          subscriptionId,
        });
      } else {
        // Pausar a assinatura por um período
        response = await apiRequest("POST", "/api/stripe/pause-subscription-period", {
          subscriptionId,
          periodoDias: parseInt(selectedOption),
        });
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "Erro ao processar sua solicitação. Tente novamente."
        );
      }

      toast({
        title: selectedOption === "cancel" 
          ? "Assinatura cancelada" 
          : `Assinatura pausada por ${selectedOption} dias`,
        description: selectedOption === "cancel"
          ? "Sua assinatura foi cancelada com sucesso."
          : `Sua assinatura será retomada automaticamente em ${data.retornaNoDia || "-"}.`,
      });

      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonIcon = () => {
    return type === "email" ? <Pause className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full">
          {getButtonIcon()}
          Pausar ou Cancelar Assinatura
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Pausar ou Cancelar Assinatura</AlertDialogTitle>
          <AlertDialogDescription>
            Você pode pausar temporariamente sua assinatura ou cancelá-la definitivamente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedOption}
            onValueChange={setSelectedOption}
            className="space-y-3"
          >
            {pausePeriods.map((period) => (
              <div
                key={period.value}
                className={`flex items-start space-x-3 border p-3 rounded-md ${
                  selectedOption === period.value
                    ? "border-primary bg-primary/5"
                    : "border-gray-200"
                }`}
              >
                <RadioGroupItem value={period.value} id={`period-${period.value}`} />
                <div className="flex-1">
                  <Label htmlFor={`period-${period.value}`} className="font-medium">
                    {period.value === "cancel" ? (
                      <span className="flex items-center text-red-600">
                        <Ban className="mr-2 h-4 w-4" />
                        {period.label}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {period.label}
                      </span>
                    )}
                  </Label>
                  <p className="text-sm text-gray-500">{period.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleAction();
            }}
            disabled={isLoading}
            className={selectedOption === "cancel" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isLoading ? "Processando..." : selectedOption === "cancel" ? "Cancelar Assinatura" : "Pausar Assinatura"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}