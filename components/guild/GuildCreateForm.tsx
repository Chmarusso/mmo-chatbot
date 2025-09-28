"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface GuildCreateFormProps {
  isVerified: boolean;
}

export function GuildCreateForm({ isVerified }: GuildCreateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    creationCode: "",
    name: "",
    description: "",
    chainId: "",
    tokenAddress: "",
    payerAddress: "",
    amountWei: "",
    txHash: "",
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isVerified) {
      toast.error("Only verified players can create guilds.");
      return;
    }

    if (!form.creationCode.trim()) {
      toast.error("Creation code is required.");
      return;
    }

    const chainId = Number(form.chainId);
    if (!Number.isInteger(chainId) || chainId <= 0) {
      toast.error("Enter a valid chain ID.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Guild name is required.");
      return;
    }

    if (!form.payerAddress.trim() || !form.txHash.trim()) {
      toast.error("Payer address and transaction hash are required.");
      return;
    }

    if (!/^\d+$/.test(form.amountWei.trim())) {
      toast.error("Amount (wei) must be a number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentResponse = await fetch("/api/guild-codes/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: form.creationCode.trim(),
          chainId,
          tokenAddress: form.tokenAddress.trim() || null,
          payerAddress: form.payerAddress.trim(),
          amountWei: form.amountWei.trim(),
          txHash: form.txHash.trim(),
        }),
      });

      const paymentPayload = await paymentResponse.json().catch(() => ({}));
      if (!paymentResponse.ok) {
        throw new Error(paymentPayload.error ?? "Payment submission failed");
      }

      const createResponse = await fetch("/api/guilds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creationCode: form.creationCode.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      });

      const createPayload = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(createPayload.error ?? "Failed to create guild");
      }

      toast.success("Guild created! Redirecting...");
      router.push(`/guilds/${createPayload.guild.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to create guild");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 shadow-glow lg:p-10">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold lg:text-2xl">Create a guild</h2>
        <p className="text-sm text-gray-400 lg:text-base">
          Use a paid creation code to launch a new invite-only guild. Payments accept native ETH or any ERC-20 token; provide the on-chain transaction details below.
        </p>
        {!isVerified && (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
            Guild creation is limited to verified players. Contact support to verify your profile.
          </p>
        )}
      </div>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-accent-cyan" htmlFor="creationCode">
              Creation code
            </label>
            <Input
              id="creationCode"
              placeholder="XXXXXX"
              value={form.creationCode}
              onChange={(event) => handleChange("creationCode", event.target.value.toUpperCase())}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-accent-cyan" htmlFor="chainId">
              Chain ID
            </label>
            <Input
              id="chainId"
              placeholder="1 (Ethereum mainnet)"
              value={form.chainId}
              onChange={(event) => handleChange("chainId", event.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-accent-cyan" htmlFor="payerAddress">
              Payer address
            </label>
            <Input
              id="payerAddress"
              placeholder="0x..."
              value={form.payerAddress}
              onChange={(event) => handleChange("payerAddress", event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-accent-cyan" htmlFor="tokenAddress">
              Token contract (optional)
            </label>
            <Input
              id="tokenAddress"
              placeholder="0x... (leave blank for native)"
              value={form.tokenAddress}
              onChange={(event) => handleChange("tokenAddress", event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-accent-cyan" htmlFor="amountWei">
              Amount (wei)
            </label>
            <Input
              id="amountWei"
              placeholder="100000000000000000"
              value={form.amountWei}
              onChange={(event) => handleChange("amountWei", event.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Provide the payment amount in wei. Use a converter if you have a decimal amount.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-accent-cyan" htmlFor="txHash">
              Transaction hash
            </label>
            <Input
              id="txHash"
              placeholder="0x..."
              value={form.txHash}
              onChange={(event) => handleChange("txHash", event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-accent-cyan" htmlFor="name">
            Guild name
          </label>
          <Input
            id="name"
            placeholder="Nightfall Vanguard"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            required
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-accent-cyan" htmlFor="description">
            Description
          </label>
          <Textarea
            id="description"
            placeholder="Share what your guild is about."
            value={form.description}
            onChange={(event) => handleChange("description", event.target.value)}
            maxLength={250}
          />
          <p className="text-xs text-gray-500 text-right">{form.description.length}/250</p>
        </div>

        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !isVerified}>
          {isSubmitting ? "Creating guild..." : "Create guild"}
        </Button>
      </form>
    </section>
  );
}
