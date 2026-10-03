import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
	return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
	if (process.env.TAURI_EXPORT === "true") {
		return NextResponse.json(
			{ error: "Not available in desktop" },
			{ status: 400 },
		);
	}

	try {
		const body = await req.json();
		const { transaction_id } = body;

		if (!transaction_id) {
			return NextResponse.json(
				{ error: "Transaction ID is required" },
				{ status: 400 },
			);
		}

		// Security: FLUTTERWAVE_SECRET_KEY is read strictly from server environment variables
		const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

		if (!secretKey) {
			return NextResponse.json(
				{ error: "Payment gateway configuration is missing on server" },
				{ status: 500 },
			);
		}

		// Verify transaction directly with Flutterwave API
		const response = await fetch(
			`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${secretKey}`,
					"Content-Type": "application/json",
				},
				cache: "no-store",
			},
		);

		const data = await response.json();

		if (data.status === "success" && data.data?.status === "successful") {
			return NextResponse.json({
				success: true,
				message: "Payment verified successfully",
				transaction: {
					id: data.data.id,
					tx_ref: data.data.tx_ref,
					amount: data.data.amount,
					currency: data.data.currency,
					customer: data.data.customer,
					created_at: data.data.created_at,
				},
			});
		}

		return NextResponse.json(
			{
				success: false,
				message: data.message || "Payment verification failed or is pending",
				data: data.data,
			},
			{ status: 400 },
		);
	} catch (error) {
		console.error("Flutterwave verification error:", error);
		return NextResponse.json(
			{ error: "Internal server error during payment verification" },
			{ status: 500 },
		);
	}
}
