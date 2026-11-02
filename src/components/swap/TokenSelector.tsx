import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X, Loader2, AlertCircle, Check, Plus, Download, Shield, ShieldAlert, ShieldX, AlertTriangle, Trash2 } from 'lucide-react';
import { getTokenList, TokenInfo } from '@/config/contracts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { useTokenBalance } from '@/hooks/useContract';
import { useValidateToken } from '@/hooks/useLiquidityPools';
import { useTokenSafety, SafetyLevel } from '@/hooks/useTokenSafety';
import { formatEther, formatUnits } from 'viem';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TokenIcon } from '@/components/ui/TokenIcon';

interface TokenSelectorProps {
  selectedToken: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  disabledToken?: TokenInfo | null;
  label?: string;
}

const IMPORTED_TOKENS_KEY = 'quantax_imported_tokens';

function getImportedTokens(): TokenInfo[] {
  try {
    let stored = localStorage.getItem(IMPORTED_TOKENS_KEY);
    if (!stored) {
      const legacy = localStorage.getItem('dragondex_imported_tokens');
      if (legacy) {
        localStorage.setItem(IMPORTED_TOKENS_KEY, legacy);
        localStorage.removeItem('dragondex_imported_tokens');
        stored = legacy;
      }
    }
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveImportedToken(token: TokenInfo) {
  const tokens = getImportedTokens();
  if (!tokens.find(t => t.address.toLowerCase() === token.address.toLowerCase())) {
    tokens.push(token);
    localStorage.setItem(IMPORTED_TOKENS_KEY, JSON.stringify(tokens));
  }
}

function removeImportedToken(address: string) {
  const tokens = getImportedTokens();
  const filtered = tokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
  localStorage.setItem(IMPORTED_TOKENS_KEY, JSON.stringify(filtered));
}

// Safety badge component
function SafetyBadge({ level }: { level: SafetyLevel }) {
  const config = {
    verified: { icon: Shield, text: 'Verified', className: 'text-success bg-success/10' },
    warning: { icon: ShieldAlert, text: 'Unverified', className: 'text-warning bg-warning/10' },
    danger: { icon: ShieldX, text: 'Risky', className: 'text-destructive bg-destructive/10' },
    unknown: { icon: AlertCircle, text: 'Unknown', className: 'text-muted-foreground bg-muted' },
  };
  const { icon: Icon, text, className } = config[level];

  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', className)}>
      <Icon className="w-2.5 h-2.5" />
      {text}
    </span>
  );
}

// Token balance display component
const TokenBalanceDisplay = ({ token, address }: { token: TokenInfo; address?: `0x${string}` }) => {
  const { data: nativeBalance } = useBalance({ address });
  const { data: tokenBalance } = useTokenBalance(
    !token.isNative ? (token.address as `0x${string}`) : undefined,
    address
  );

  if (!address) return null;

  const balance = token.isNative
    ? (nativeBalance ? formatEther(nativeBalance.value) : '0')
    : (tokenBalance ? formatUnits(tokenBalance, token.decimals) : '0');

  const formattedBalance = parseFloat(balance).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

  return (
    <span className="text-sm text-muted-foreground font-medium tabular-nums">
      {formattedBalance}
    </span>
  );
};

// Import confirmation panel with safety analysis
function ImportConfirmation({
  address,
  symbol,
  name,
  onImport,
  onCancel
}: {
  address: string;
  symbol: string;
  name: string;
  onImport: () => void;
  onCancel: () => void;
}) {
  const safety = useTokenSafety(address as `0x${string}`);
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="px-4 pb-3">
      <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-3">
        {/* Token info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{symbol}</p>
              <SafetyBadge level={safety.level} />
            </div>
            <p className="text-xs text-muted-foreground">{name || symbol}</p>
          </div>
        </div>

        {/* Safety warnings */}
        {safety.warnings.length > 0 && (
          <div className="space-y-1.5">
            {safety.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-warning">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Metadata */}
        {safety.metadata.totalSupply && (
          <div className="text-xs text-muted-foreground flex justify-between">
            <span>Total Supply</span>
            <span className="font-mono">{parseFloat(safety.metadata.totalSupply).toLocaleString()}</span>
          </div>
        )}

        {/* Warning disclaimer */}
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
          <p className="text-xs text-warning font-medium mb-1">⚠️ Import at your own risk</p>
          <p className="text-[11px] text-muted-foreground">
            This token is not part of the QuantaX default list. Anyone can create a token, including fake versions of existing tokens. Always verify the contract address.
          </p>
        </div>

        {/* Acceptance checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">
            I understand the risks and want to import this token
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1 h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={onImport}
            size="sm"
            disabled={!accepted || safety.level === 'danger'}
            className={cn(
              "flex-1 h-8 text-xs",
              safety.level === 'danger' ? "bg-destructive" : "btn-dragon"
            )}
          >
            {safety.level === 'danger' ? 'Too Risky' : 'Import Token'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TokenSelector({ selectedToken, onSelect, disabledToken, label }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [importedTokens, setImportedTokens] = useState<TokenInfo[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const TOKEN_LIST = getTokenList(chainId);

  const isAddressSearch = /^0x[a-fA-F0-9]{40}$/.test(search);
  const { isValid, isLoading: isValidating, symbol, name, decimals } = useValidateToken(
    isAddressSearch ? (search as `0x${string}`) : undefined
  );

  useEffect(() => {
    setImportedTokens(getImportedTokens());
  }, []);

  const allTokens = [...TOKEN_LIST, ...importedTokens.filter(
    imported => !TOKEN_LIST.find(t => t.address.toLowerCase() === imported.address.toLowerCase())
  )];

  const filteredTokens = allTokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.address.toLowerCase().includes(search.toLowerCase())
  );

  const addressAlreadyExists = isAddressSearch && allTokens.find(
    t => t.address.toLowerCase() === search.toLowerCase()
  );

  const handleImportToken = () => {
    if (!isValid || !symbol || !search) return;

    const newToken: TokenInfo = {
      address: search,
      symbol: symbol,
      name: name || symbol,
      decimals: decimals || 18,
      logoURI: '/tokens/qms.svg',
    };

    saveImportedToken(newToken);
    setImportedTokens(prev => [...prev, newToken]);
    onSelect(newToken);
    setIsOpen(false);
    setSearch('');
    setShowImportConfirm(false);
    toast.success(`Token ${symbol} imported successfully!`, {
      description: 'Remember to verify the contract address before trading.',
    });
  };

  const handleRemoveImported = (token: TokenInfo) => {
    removeImportedToken(token.address);
    setImportedTokens(prev => prev.filter(t => t.address.toLowerCase() !== token.address.toLowerCase()));
    toast.info(`${token.symbol} removed from imported tokens`);
  };

  const isImportedToken = (addr: string) =>
    importedTokens.some(t => t.address.toLowerCase() === addr.toLowerCase());

  const isWhitelistedToken = (addr: string) =>
    TOKEN_LIST.some(t => t.address.toLowerCase() === addr.toLowerCase());

  return (
    <>
      {label && (
        <span className="text-xs text-muted-foreground mb-1.5 block">{label}</span>
      )}

      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(
          "flex items-center gap-2 px-3 rounded-xl transition-colors min-w-[130px] min-h-[44px]",
          "bg-muted/80 hover:bg-muted border border-border/50 hover:border-primary/40"
        )}
      >
        {selectedToken ? (
          <>
            <TokenIcon
              src={selectedToken.logoURI}
              symbol={selectedToken.symbol}
              alt={selectedToken.symbol}
              size={24}
              fallbackSrc="/tokens/qms.svg"
            />
            <span className="font-semibold">{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Select</span>
        )}
        <ChevronDown className={cn("w-4 h-4 ml-auto text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => { setIsOpen(false); setShowImportConfirm(false); }}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="w-full sm:max-w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border border-border/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                  <h2 className="text-lg font-bold">Select a token</h2>
                  <button
                    onClick={() => { setIsOpen(false); setShowImportConfirm(false); }}
                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    aria-label="Close token selector"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Search */}
                <div className="px-4 pt-4 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, symbol, or paste address"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setShowImportConfirm(false); }}
                      className="pl-10 py-2.5 h-11 bg-muted/30 border-border/30 rounded-xl text-sm placeholder:text-muted-foreground/60"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Import Section with Safety Analysis */}
                {isAddressSearch && !addressAlreadyExists && !showImportConfirm && (
                  <div className="px-4 pb-3">
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/30">
                      {isValidating ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-muted-foreground">Validating token contract...</span>
                        </div>
                      ) : isValid && symbol ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-warning" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{symbol}</p>
                            <p className="text-xs text-muted-foreground">{name || symbol}</p>
                          </div>
                          <Button
                            onClick={() => setShowImportConfirm(true)}
                            size="sm"
                            variant="outline"
                            className="h-8 border-warning/50 text-warning hover:bg-warning/10"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Import
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>Invalid or non-standard token contract</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Import confirmation with safety checks */}
                {showImportConfirm && isValid && symbol && (
                  <ImportConfirmation
                    address={search}
                    symbol={symbol}
                    name={name || symbol}
                    onImport={handleImportToken}
                    onCancel={() => setShowImportConfirm(false)}
                  />
                )}

                {/* Token List */}
                <div className="max-h-[340px] overflow-y-auto px-2">
                  {filteredTokens.length === 0 && !isAddressSearch ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No tokens found</p>
                      <p className="text-xs mt-1 opacity-70">Try searching by name or paste contract address</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 pb-2">
                      {/* Whitelisted tokens first */}
                      {filteredTokens
                        .sort((a, b) =>
                          Number(isWhitelistedToken(b.address)) - Number(isWhitelistedToken(a.address))
                        )
                        .map((token) => {
                          const isDisabled = disabledToken?.address === token.address;
                          const isSelected = selectedToken?.address === token.address;
                          const isImported = isImportedToken(token.address);
                          const isWhitelisted = isWhitelistedToken(token.address);

                          return (
                            <div key={token.address} className="flex items-center group">
                              <button
                                onClick={() => {
                                  if (!isDisabled) {
                                    onSelect(token);
                                    setIsOpen(false);
                                    setSearch('');
                                    setShowImportConfirm(false);
                                  }
                                }}
                                disabled={isDisabled}
                                className={cn(
                                  "flex-1 flex items-center gap-3 px-3 py-3 rounded-xl transition-all min-w-0",
                                  isDisabled
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-muted/50 cursor-pointer",
                                  isSelected && "bg-primary/10 border border-primary/30"
                                )}
                              >
                                <div className="relative flex-shrink-0">
                                  <TokenIcon
                                    src={token.logoURI}
                                    symbol={token.symbol}
                                    alt={token.symbol}
                                    size={38}
                                    fallbackSrc="/tokens/qms.svg"
                                  />

                                  {isImported && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-warning rounded-full flex items-center justify-center border-2 border-card">
                                      <AlertTriangle className="w-2 h-2 text-warning-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold truncate">{token.symbol}</span>
                                    {isWhitelisted && (
                                      <SafetyBadge level="verified" />
                                    )}
                                    {isImported && (
                                      <SafetyBadge level="warning" />
                                    )}
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">{token.name}</div>
                                </div>
                                <div className="flex-shrink-0 pl-2">
                                  <TokenBalanceDisplay token={token} address={address as `0x${string}`} />
                                </div>
                              </button>
                              {/* Remove button for imported tokens */}
                              {isImported && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImported(token);
                                  }}
                                  className="p-2 mr-1 rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                  title="Remove imported token"
                                  aria-label={`Remove ${token.symbol} from imported tokens`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                <div className="px-5 py-3 border-t border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Download className="w-3 h-3 flex-shrink-0" />
                  <span>Paste a token contract address to import it, with automatic safety checks.</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
