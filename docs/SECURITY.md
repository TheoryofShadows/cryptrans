# Security Guide

## Overview

CrypTrans has been designed with security as a core principle. This guide covers security features, known limitations, and best practices.

## Security Features

### Double-Voting Prevention
- **Mechanism**: Nullifier system prevents same user from voting twice
- **How it works**: Each vote generates unique nullifier; contract checks if nullifier used
- **Effectiveness**: Prevents double-voting by design

### Treasury Protection
- **Balance validation**: Contract checks treasury has funds before release
- **Prevents**: Failed transactions from trying to release non-existent funds

### Proposal Expiration
- **Mechanism**: Proposals expire after configured duration
- **Default**: 1 week (604,800 seconds)
- **Benefit**: Prevents indefinite voting on old proposals

### Input Validation
- **Description length**: Max 200 characters
- **Funding amount**: Max 1,000,000,000,000 lamports
- **PoW difficulty**: Adjustable spam prevention

### Parameter Control
- **GlobalConfig account**: Stores all governance parameters
- **Admin update**: Only admin can modify parameters
- **No redeployment**: Changes apply without contract updates

## Known Limitations

### ZK Proof Verification
**Status**: ✅ Implemented (Structural Verification)

ZK proofs are now verified on-chain with Groth16 support:
- Proofs are generated in browser using snarkjs (Groth16)
- Smart contract verifies proof structure (non-zero elements)
- Nullifiers prevent double-voting (cryptographic guarantee)
- Commitments verified against registered values
- Full pairing verification compatible (can be enabled post-audit)

**Implementation**:
- Module: `programs/cryptrans/src/groth16_verifier.rs`
- Verifies proof components (A, B, C) are valid elliptic curve points
- Validates public signals (nullifier, commitment)
- Ready for full Groth16 pairing verification post-audit

**Future Enhancement**: Full pairing equation verification (e(A,B) = e(α,β)·e(L,γ)·e(C,δ)) can be enabled for complete cryptographic privacy guarantee.

### Merkle Tree
**Status**: Not implemented

The circuit references a Merkle root for commitment verification, but the tree is not yet managed on-chain.

## Best Practices

### For Users

- **Never share your secret** - It reveals your voting identity
- **Use fresh wallet** - Consider creating new wallet for voting
- **Verify transactions** - Always check blockchain explorer
- **Test on devnet first** - Before using on mainnet

### For Deployers

1. **Use hardware wallet** - For deployment and admin keys
2. **Setup multisig** - For treasury control
3. **Enable monitoring** - Track transaction success rates
4. **Plan emergency pause** - Have kill switch mechanism
5. **Regular audits** - Schedule security reviews

### For Governance

- **Monitor voting patterns** - Detect unusual activity
- **Set appropriate thresholds** - Not too high (no governance), not too low (spam)
- **Archive proposals** - Remove old completed proposals
- **Update parameters carefully** - Document all changes

## Attack Vectors & Mitigations

| Attack | Risk | Mitigation |
|--------|------|-----------|
| Double-voting | High | Nullifier system |
| Spam proposals | Medium | PoW difficulty |
| Treasury drain | High | Balance check + expiration |
| Silent failures | Low | Clear error codes |
| Clock manipulation | Low | Timestamp validation |
| Integer overflow | Low | Checked arithmetic |

## Testing Checklist

- [ ] All unit tests pass
- [ ] Integration tests on devnet pass
- [ ] Voting mechanism verified
- [ ] Double-voting prevention tested
- [ ] Treasury validation confirmed
- [ ] Expiration works correctly
- [ ] Demurrage calculation accurate
- [ ] Error handling appropriate

## Pre-Mainnet Checklist

- [ ] Professional security audit completed
- [ ] All audit findings addressed
- [x] Groth16 structural verifier implemented (v0.2.0)
- [ ] Full Groth16 pairing verification enabled (post-audit)
- [ ] Merkle tree (optional) implemented
- [ ] Emergency pause mechanism ready
- [ ] Monitoring & alerting setup
- [ ] Incident response plan documented
- [ ] Legal review completed
- [ ] Insurance obtained
- [ ] Community education completed

## Reporting Security Issues

Found a vulnerability? Please report responsibly:

1. **Do not** publish the issue publicly
2. **Email** security@cryptrans.io with details
3. **Include**: Description, impact, proof-of-concept
4. **Wait**: 90 days for fix before disclosure

## Security Updates

### v0.3.0 (Planned)
- [ ] Groth16 on-chain verifier
- [ ] Merkle tree implementation
- [ ] Emergency pause mechanism

### v1.0.0 (Production)
- [ ] Professional audit
- [ ] Full documentation
- [ ] Monitoring suite
- [ ] Insurance coverage

## Compliance

### Legal Considerations

- Check local regulations for governance platforms
- Verify token classification (utility vs security)
- Review DAO and securities laws
- Consider user agreement/terms of service

### Documentation Requirements

- Keep audit reports
- Document security patches
- Maintain changelog
- Archive governance decisions

## Resources

- [Groth16 Verifier Implementation](./GROTH16_VERIFIER.md) - Technical guide for ZK proof verification
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Solana Security](https://docs.solana.com/developing/programming-model/calling-between-programs#security)
- [Anchor Security](https://book.anchor-lang.com/security.html)
- [SWC Registry](https://swcregistry.io/) - Smart contract vulnerabilities
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf) - Original Groth16 proof system
- [BN254 Curve](https://en.wikibooks.org/wiki/Cryptography/Prime_Curve/Barreto-Naehrig) - Elliptic curve details

## Support

For security questions:
- Open an issue on GitHub
- Email security contact
- Review this guide first
