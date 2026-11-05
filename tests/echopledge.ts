// Generated scaffold only. RPC calls submit transactions; do not run without approval.
import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Echopledge } from "../target/types/echopledge";

describe("echopledge", () => {
  // Use the configured Devnet provider only with explicit transaction approval.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.echopledge as Program<Echopledge>;

  it("Initializes and increments a counter", async () => {
    const [counter] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("counter")],
      program.programId
    );

    const initializeTx = await program.methods
      .initialize()
      .accountsPartial({ counter })
      .rpc();
    console.log("Initialize transaction signature", initializeTx);

    const incrementTx = await program.methods
      .increment()
      .accountsPartial({ counter })
      .rpc();
    console.log("Increment transaction signature", incrementTx);
  });
});
