import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SOCIAL_LINKS } from "@/site/social";
import { Shield, Lock, HardDrive, UserCheck, CreditCard, RefreshCw, Mail } from "lucide-react";

export const metadata: Metadata = {
	title: "Privacy Policy - AmberCut",
	description:
		"Learn how AmberCut handles your data, privacy, and local content across our Windows desktop application and web editor. Microsoft Store certified privacy policy.",
	openGraph: {
		title: "Privacy Policy - AmberCut",
		description:
			"Learn how AmberCut protects your data, content, and privacy across desktop and web.",
		type: "website",
	},
};

export default function PrivacyPage() {
	return (
		<BasePage
			title="Privacy Policy"
			description="Effective Date: October 16, 2026 — Learn how AmberCut respects and protects your privacy across our Windows desktop application and web platform."
		>
			{/* Quick Summary Banner */}
			<div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 mb-2">
				<div className="flex items-center gap-2.5 font-bold text-orange-600 dark:text-orange-400 mb-2">
					<Shield className="size-5 shrink-0" />
					<span>Key Summary at a Glance</span>
				</div>
				<ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
					<li><strong>Your video and audio files never leave your device.</strong> All video editing, cutting, rendering, and export processing happens entirely on your local hardware.</li>
					<li><strong>No file uploads to private servers:</strong> We never store, host, or inspect your personal video projects on our servers.</li>
					<li><strong>Transparent Account Options:</strong> You can edit videos anonymously without signing in. If you choose to sign in (via Google OAuth / Firebase), we only store your basic profile (email and name) to sync your PRO license.</li>
					<li><strong>Secure Payments:</strong> Payments are processed directly through certified PCI-DSS compliant gateways (Flutterwave). We never store payment card numbers.</li>
				</ul>
			</div>

			<Accordion type="single" collapsible defaultValue="summary" className="w-full">
				<AccordionItem value="summary" className="rounded-2xl border px-5">
					<AccordionTrigger className="no-underline! font-semibold">
						Microsoft Store & Compliance Overview
					</AccordionTrigger>
					<AccordionContent className="space-y-3 text-sm text-muted-foreground">
						<p>
							This Privacy Policy governs your use of the <strong>AmberCut</strong> software application (including the Windows desktop app distributed via the Microsoft Store and installer packages, and the web app hosted at <code>https://ambercut.vercel.app</code>).
						</p>
						<p>
							AmberCut is designed with a <strong>privacy-first, local-first architecture</strong>. Your media assets remain solely on your computer, under your absolute ownership and control.
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			{/* Section 1: Content Privacy */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<HardDrive className="size-5 text-orange-500" />
					<h2 className="text-xl font-bold font-clash">1. How We Handle Your Media Content</h2>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					<strong>All media processing is strictly local.</strong> When you import videos, audio clips, images, or project timelines into AmberCut, they are read directly from your local file system (desktop app) or saved in your browser&apos;s sandboxed IndexedDB storage (web app).
				</p>
				<p className="text-sm text-muted-foreground leading-relaxed">
					At no point are your video files, audio tracks, exported renders, or draft timelines uploaded, streamed, or transmitted to AmberCut servers.
				</p>
			</section>

			{/* Section 2: Information We Collect */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<UserCheck className="size-5 text-orange-500" />
					<h2 className="text-xl font-bold font-clash">2. Information We Collect</h2>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Depending on how you use AmberCut, we may collect the following limited categories of information:
				</p>
				<div className="space-y-3 text-sm text-muted-foreground pl-2">
					<div>
						<strong className="text-foreground">A. Authentication & Account Data (Optional):</strong>
						<p className="mt-1">
							If you create an account or sign in with Google OAuth via our secure browser bridge, Firebase Authentication securely processes your name, email address, and profile photo URL. This data is strictly used to authenticate your session and manage your AmberCut PRO plan.
						</p>
					</div>
					<div>
						<strong className="text-foreground">B. Subscription & Payment Data:</strong>
						<p className="mt-1">
							When purchasing AmberCut PRO, transactions are executed through our authorized payment partner, <strong>Flutterwave</strong>. Flutterwave collects necessary payment details (such as card details or billing address). AmberCut only receives confirmation tokens and transaction reference IDs to activate your subscription; we never hold or store raw payment card data.
						</p>
					</div>
					<div>
						<strong className="text-foreground">C. Diagnostics & Technical Telemetry:</strong>
						<p className="mt-1">
							To maintain application stability and satisfy Microsoft Store quality standards, we may receive anonymized crash reports or device capability metrics (e.g., operating system version, GPU acceleration support, app version). No personally identifiable video content is ever included in diagnostic logs.
						</p>
					</div>
				</div>
			</section>

			{/* Section 3: Third-Party Services */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<Lock className="size-5 text-orange-500" />
					<h2 className="text-xl font-bold font-clash">3. Third-Party Service Providers</h2>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					AmberCut integrates with trusted industry partners strictly to deliver required platform services:
				</p>
				<ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1.5">
					<li><strong>Google Firebase (Google LLC):</strong> Provides secure OAuth authentication and synchronized session handshakes between the desktop application and your web browser.</li>
					<li><strong>Flutterwave:</strong> Provides PCI-DSS compliant payment processing for international (USD) and local (NGN) subscriptions.</li>
					<li><strong>Vercel Inc.:</strong> Hosts web services and delivery infrastructure for <code>https://ambercut.vercel.app</code>.</li>
					<li><strong>Microsoft Corporation:</strong> Facilitates application deployment, licensing, and updates via the Microsoft Store.</li>
				</ul>
			</section>

			{/* Section 4: Local Storage and Preferences */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<RefreshCw className="size-5 text-orange-500" />
					<h2 className="text-xl font-bold font-clash">4. Local Storage and Cookies</h2>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					AmberCut uses device local storage (IndexedDB, localStorage, and application configuration directories) to store your preferences (such as dark mode theme, recent project lists, audio booster volume levels, and timeline zoom levels). You can clear this data at any time by removing your browser cache or deleting the application&apos;s local user directory.
				</p>
			</section>

			{/* Section 5: User Rights and Data Deletion */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<Shield className="size-5 text-orange-500" />
					<h2 className="text-xl font-bold font-clash">5. Your Rights & Data Deletion (GDPR / CCPA)</h2>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					In accordance with applicable global privacy laws (including the General Data Protection Regulation and California Consumer Privacy Act):
				</p>
				<ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1.5">
					<li><strong>Right to Access:</strong> You can request a summary of any account information linked to your email address.</li>
					<li><strong>Right to Erasure (Deletion):</strong> You may request permanent deletion of your AmberCut account and associated records by contacting us. Upon request, all associated credentials and session records in Firebase will be irreversibly erased within 30 days.</li>
					<li><strong>Right to Portability:</strong> Your video export files belong entirely to you and can be exported, moved, or deleted from your device without restriction.</li>
				</ul>
			</section>

			{/* Section 6: Children's Privacy */}
			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-bold font-clash">6. Children&apos;s Privacy</h2>
				<p className="text-sm text-muted-foreground leading-relaxed">
					AmberCut does not knowingly collect personally identifiable information from children under the age of 13. If you believe a child has provided us with personal information, please contact us immediately and we will delete the information promptly.
				</p>
			</section>

			{/* Section 7: Contact Us */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<Mail className="size-5 text-orange-500" />
					<h2 className="text-xl font-bold font-clash">7. Contact Information</h2>
				</div>
				<p className="text-sm text-muted-foreground leading-relaxed">
					If you have questions, feedback, or data privacy requests regarding AmberCut or our Microsoft Store submission, please contact us:
				</p>
				<div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-1.5 text-xs text-muted-foreground">
					<p><strong className="text-foreground">Product:</strong> AmberCut Video Editor</p>
					<p><strong className="text-foreground">Official Website:</strong> <a href="https://ambercut.vercel.app" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://ambercut.vercel.app</a></p>
					<p><strong className="text-foreground">Privacy Page:</strong> <a href="https://ambercut.vercel.app/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">https://ambercut.vercel.app/privacy</a></p>
					<p><strong className="text-foreground">Support & Inquiries:</strong> <a href="mailto:support@ambercut.vercel.app" className="text-orange-500 hover:underline">support@ambercut.vercel.app</a></p>
					<p><strong className="text-foreground">GitHub Issues:</strong> <a href={`${SOCIAL_LINKS.github}/issues`} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">{SOCIAL_LINKS.github}/issues</a></p>
				</div>
			</section>

			<Separator />

			<div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
				<span>Last Updated: October 16, 2026</span>
				<span>Compliant with Microsoft Store App Developer Policies</span>
			</div>
		</BasePage>
	);
}
