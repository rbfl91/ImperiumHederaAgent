export default function Header() {
  return (
    <header className="header">
      <div className="header-logo">
        <svg width="36" height="28" viewBox="0 0 520 285" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(0 -1)">
            <path fillRule="evenodd" clipRule="evenodd" fill="#F8C200"
              d="M513.6,282.7V55.9L191,150.8C305.6,174.9,414.9,219.6,513.6,282.7" />
            <path fillRule="evenodd" clipRule="evenodd" fill="#F8C200"
              d="M416.2,228.15h7.2V6.66L5.1,129.76v0.2C152.4,132.36,291.7,167.36,416.2,228.15" />
            <path fillRule="evenodd" clipRule="evenodd" fill="#F35D00"
              d="M191,150.8c0.5,0.1,1,0.2,1.5,0.3c1.4,0.3,2.8,0.6,4.2,0.9c6.7,1.5,13.3,3,19.9,4.5
              c2.6,0.6,5.1,1.3,7.7,1.9c8.3,2,16.5,4.2,24.7,6.5c5.4,1.5,10.8,3,16.1,4.6c2.6,0.8,5.1,1.5,7.7,2.3
              c6.2,1.9,12.3,3.8,18.5,5.8c1.6,0.5,3.3,1,4.9,1.6c7.9,2.6,15.8,5.3,23.6,8.2c0.7,0.3,1.4,0.5,2.1,0.8
              c7,2.5,13.9,5.2,20.8,7.8c2,0.8,4,1.6,5.9,2.4c13.6,5.4,27.1,11.1,40.5,17.1c1.8,0.8,3.6,1.6,5.4,2.4
              c6.7,3.1,13.4,6.2,20,9.4l1.5,0.7h7.2V82.4L191,150.8z" />
          </g>
        </svg>
        <span className="header-title">Imperium Markets Agent</span>
      </div>
      <nav className="header-nav">
        <a href="https://imperium.markets/market-users/#investors" target="_blank" rel="noopener noreferrer">Market Rates</a>
        <a href="https://imperium.markets/why-us/#solution" target="_blank" rel="noopener noreferrer">How it works</a>
        <a href="https://imperium.markets/contact-us/" target="_blank" rel="noopener noreferrer">Support</a>
      </nav>
    </header>
  );
}
