export function BrandMark({ size = 28 }: { size?: number }) {
	return (
		<span className="brand-mark" style={{ width: size, height: size }}>
			<img src="/logo.jpg" alt="" width={size} height={size} />
		</span>
	);
}

export function BrandLockup({
	size = 28,
	className,
}: {
	size?: number;
	className?: string;
}) {
	return (
		<span className={['brand-lockup', className].filter(Boolean).join(' ')}>
			<BrandMark size={size} />
			<span className="brand-wordmark">
				<em>TIGER</em>BULL
			</span>
		</span>
	);
}
