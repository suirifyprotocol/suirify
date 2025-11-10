
/*
  conText - small presentational helper that returns a paragraph describing doxxing.
  Section-level comment added to explain purpose at the component level.
*/
function conText() {
  return (
    <>
      <p>
        <span className="dox">DOXXING</span>
        <br />Doxxing in Web3 is publicly revealing a pseudonymous user’s real identity or sensitive
        information, undermining privacy, anonymity, and decentralization principles.
      </p>
    </>
  );
}

export default conText;