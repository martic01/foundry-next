// Generated from the uploaded "MarTech Stage 1 Course Notes" document --
// parsed automatically (Week/Day headers + concept/MEANING/EXAMPLE
// blocks) rather than hand-typed, so it matches the source doc exactly.
// Updated from a revised version of that doc -- 27 days across 9 weeks,
// 192 concept cards total. Rendered day-by-day, locked/unlocked per
// note_unlocks (see supabase/schema.sql) by app/dashboard/notes/page.jsx.
export const FOUNDATIONS_NOTES = [
  {
    "day": 1,
    "week": 1,
    "weekTitle": "Understand the Web + HTML Foundations",
    "title": "Introduction to Web Development + AI",
    "intro": "Today is about the big picture — what programming and web development actually are, before touching any code.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Programming",
        "meaning": "Programming means giving a computer clear, step-by-step instructions so it does exactly what you want, in an order it can follow with no guessing.",
        "example": "Telling a computer: \"If the button is clicked, show a thank-you message\" is a programming instruction — clear, specific, and in order."
      },
      {
        "title": "Web Development",
        "meaning": "Web development is the skill of building websites and web apps — the pages, buttons, and features you use inside a browser like Chrome or Safari.",
        "example": "Building an online shop where people can browse products and click \"Add to Cart\" is a web development project."
      },
      {
        "title": "How Websites Work",
        "meaning": "A website is a set of files (text, images, instructions) stored on a computer called a \"server\" that is always connected to the internet. Your browser asks the server for those files and displays them for you.",
        "example": "When you type amazon.com into your browser, your browser sends a request to Amazon's server, the server sends back the page's files, and your browser turns those files into the page you see."
      },
      {
        "title": "Frontend vs Backend",
        "meaning": "Frontend is everything a visitor can see and click on. Backend is the hidden machinery behind the scenes that stores data and makes decisions.",
        "example": "In a restaurant, the dining room — tables, menus, the food in front of you — is the frontend. The kitchen where the food is actually cooked is the backend. You never see it, but nothing on your table exists without it."
      },
      {
        "title": "HTML, CSS and JavaScript",
        "meaning": "These are the three core languages of the frontend. HTML gives a page its structure, CSS makes it look good, and JavaScript makes it do things.",
        "example": "Think of a person: HTML is the skeleton (shape and structure), CSS is the skin and clothes (appearance), and JavaScript is the muscles and reflexes (movement and reaction)."
      },
      {
        "title": "What AI Can Do For Developers",
        "meaning": "AI tools such as ChatGPT or Claude can write working code in seconds, explain confusing code in plain language, and suggest fixes for errors.",
        "example": "You can ask AI: \"Build me a simple contact form\", and within seconds it hands you working HTML, CSS, and JavaScript for it."
      },
      {
        "title": "What AI Cannot Reliably Do",
        "meaning": "AI can misunderstand what you actually meant, produce code that looks correct but has hidden bugs, or write something that does not fit the rest of your project. It cannot replace your own understanding.",
        "example": "AI might generate a \"working\" sign-up form that never actually saves the visitor's email anywhere — it looks finished, but a piece is silently missing."
      },
      {
        "title": "Setting Up VS Code, Git & GitHub",
        "meaning": "VS Code is the program (a code editor) where you write your code. Git tracks changes to your project over time. GitHub is a website that stores your Git-tracked projects online.",
        "example": "You write your website's code in VS Code, save a snapshot of your progress with Git, and back it up online by pushing it to GitHub."
      }
    ]
  },
  {
    "day": 2,
    "week": 1,
    "weekTitle": "Understand the Web + HTML Foundations",
    "title": "HTML Structure",
    "intro": "Today we open real HTML for the first time and learn the skeleton every single web page is built on.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "The HTML Document",
        "meaning": "An HTML document is simply a text file ending in .html that contains tags — the instructions that tell the browser what to display and how it's structured.",
        "example": "A file named index.html is usually the first, main page of a website — it's the file browsers look for by default."
      },
      {
        "title": "<html>",
        "meaning": "The <html> tag wraps the entire page. Everything else in the document sits inside it.",
        "example": "[<html> ... everything about your page goes here ... </html>]{.mark}"
      },
      {
        "title": "<head>",
        "meaning": "The <head> section holds information about the page that visitors don't directly see on the page itself — like the page title shown in the browser tab.",
        "example": "[<head><title>My Portfolio</title></head>]{.mark} *makes the browser tab display \"My Portfolio\"."
      },
      {
        "title": "<body>",
        "meaning": "The <body> holds everything a visitor actually sees on the page — text, images, buttons, and more.",
        "example": "[<body><h1>Welcome!</h1></body>]{.mark} *displays the visible heading \"Welcome!\" on the page."
      },
      {
        "title": "Headings",
        "meaning": "Headings (<h1> through <h6>) are titles of different sizes and importance. <h1> is the biggest, most important title on the page, like a book's main title; <h6> is the smallest, like a minor subheading.",
        "example": "[<h1>My Portfolio</h1>]{.mark} *for the page's main title, then* [<h2>My Projects</h2>]{.mark} *for a smaller section title underneath it."
      },
      {
        "title": "Paragraphs",
        "meaning": "The <p> tag defines a block of normal text — a paragraph, exactly like in a Word document.",
        "example": "[<p>I am a student learning web development.</p>]{.mark} *displays that sentence as a normal paragraph."
      },
      {
        "title": "<div>",
        "meaning": "A <div> is a generic, invisible box used to group other elements together so you can style or move them as a single unit.",
        "example": "[<div class=\"profile-card\">]{.mark} *could wrap a photo, a name, and a bio together so you can put a border around all three at once."
      },
      {
        "title": "Comments",
        "meaning": "A comment is a note written in the code that the browser completely ignores — it exists purely for humans (you, teammates, or future-you) to leave reminders.",
        "example": "[<!– TODO: replace this placeholder image –>]{.mark} *is invisible on the actual page but visible to anyone reading the code."
      },
      {
        "title": "Classes",
        "meaning": "A class is a label you can put on many different elements so you can style or control all of them together as a group.",
        "example": "Give three different buttons* [class=\"btn\"]{.mark} *and you can make all three the same colour with one single CSS rule."
      },
      {
        "title": "IDs",
        "meaning": "An id is a label meant for exactly one specific element on the page — a unique name tag, not shared with anything else.",
        "example": "[<button id=\"contact-btn\">Contact</button>]{.mark} *— because there is only one contact button on the page, id is the right choice here rather than class."
      }
    ]
  },
  {
    "day": 3,
    "week": 1,
    "weekTitle": "Understand the Web + HTML Foundations",
    "title": "HTML Elements",
    "intro": "Today we add the building blocks that appear on almost every real website: links, images, lists, buttons, tables, and the tags that describe a page's layout.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Links",
        "meaning": "A link, written with the <a> tag, takes a visitor to another page or website when clicked.",
        "example": "[<a href=\"https://google.com\">Go to Google</a>]{.mark} *displays clickable text that opens Google."
      },
      {
        "title": "Images",
        "meaning": "The <img> tag displays a picture on the page. It needs a src (source) telling the browser where to find the image file.",
        "example": "[<img src=\"cat.jpg\" alt=\"A sleeping cat\">]{.mark} *shows the picture cat.jpg, with alt text describing it for accessibility."
      },
      {
        "title": "Lists",
        "meaning": "Lists organise items. <ul> makes a bulleted (unordered) list, <ol> makes a numbered (ordered) list, and each item inside either one is written as <li>.",
        "example": "[<ul ><li>Milk</li><li>Eggs</li><li>Bread</li></ul>]{.mark} *displays a bulleted shopping list of three items."
      },
      {
        "title": "Buttons",
        "meaning": "A <button> is something a visitor can click to trigger an action, like submitting a form or running a piece of JavaScript.",
        "example": "[<button>Sign Up</button>]{.mark} *shows a clickable button labelled \"Sign Up\"."
      },
      {
        "title": "Tables",
        "meaning": "A <table> arranges information into rows and columns, built with <tr> (table row) and <td> (table cell) tags.",
        "example": "A price comparison table with one row per product and one column each for name, price, and stock status."
      },
      {
        "title": "<header>",
        "meaning": "A semantic tag for the top section of a page — commonly containing a logo and the main navigation menu.",
        "example": "[<header>]{.mark} *wrapping your site's logo and the \"Home / About / Contact\" menu at the very top of every page."
      },
      {
        "title": "<nav>",
        "meaning": "A semantic tag specifically for the block of navigation links that lets visitors move around the site.",
        "example": "[<nav><a href=\"#home\">Home</a><a href=\"#about\">About</a></nav>]{.mark} *groups your menu links together meaningfully."
      },
      {
        "title": "<main>",
        "meaning": "A semantic tag marking the central, primary content of the page — the part that's unique to that specific page, not repeated site-wide.",
        "example": "On a blog post page,* [<main>]{.mark} *would wrap the actual article text, separate from the shared header and footer."
      },
      {
        "title": "<section>",
        "meaning": "A semantic tag that groups a related chunk of content together, such as one themed part of a longer page.",
        "example": "A landing page might have* [<section id=\"features\">]{.mark} *for the features block and a separate* [<section id=\"about\">]{.mark} *for the about block."
      },
      {
        "title": "<footer>",
        "meaning": "A semantic tag for the bottom section of a page — often holding copyright text, contact links, or social icons.",
        "example": "[<footer><p>© 2026 My Website</p></footer>]{.mark} *sits at the very bottom of the page."
      }
    ]
  },
  {
    "day": 4,
    "week": 2,
    "weekTitle": "HTML + CSS",
    "title": "Forms + User Input",
    "intro": "Today's topic is how a website actually collects information from a visitor — think of any \"sign up\" page you've ever filled in.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "<form>",
        "meaning": "The <form> tag is the container that holds all the input fields of a form together, so they can be submitted as one group.",
        "example": "[<form> ... all your labels and inputs go inside here ... </form>]{.mark}"
      },
      {
        "title": "<label>",
        "meaning": "A <label> is the visible text describing what a field is for. It should always be connected to its matching input, so visitors and screen readers know exactly what to type where.",
        "example": "[<label for=\"email\">Email Address</label><input id=\"email\" type=\"email\">]{.mark} *— clicking the label text will even focus the input box."
      },
      {
        "title": "<input>",
        "meaning": "An <input> is a single box where someone types a short piece of information, such as a name, email, or password.",
        "example": "[<input type=\"text\" placeholder=\"Your name\">]{.mark} *shows an empty text box with grey hint text inside it."
      },
      {
        "title": "Submit Button",
        "meaning": "A button used to send the form's collected information onward, usually written as <button type=\"submit\"> inside the form.",
        "example": "[<button type=\"submit\">Register</button>]{.mark} *— clicking it submits everything the visitor typed into the form."
      },
      {
        "title": "<textarea>",
        "meaning": "A bigger input box designed for longer pieces of text, like a message or comment, instead of a single short answer.",
        "example": "[<textarea placeholder=\"Write your message here\"></textarea>]{.mark} *gives visitors a multi-line box to type in."
      },
      {
        "title": "<select>",
        "meaning": "Creates a dropdown menu of choices, built from a <select> tag containing several <option> tags.",
        "example": "[<select><op tion>Nigeria</option><option>Ghana</option></select>]{.mark} *lets a visitor pick one country from a dropdown."
      },
      {
        "title": "Checkboxes",
        "meaning": "Checkboxes let someone pick any number of options at once — zero, one, or many — unlike radio buttons.",
        "example": "[<input type=\"checkbox\"> I agree to the terms]{.mark} *— the visitor can freely tick or untick it."
      },
      {
        "title": "Radio Buttons",
        "meaning": "Radio buttons force someone to pick exactly one option out of a group, sharing the same \"name\" attribute so only one can be selected at a time.",
        "example": "[<input type=\"radio\" name=\"gender\"> Male]{.mark} *and* [<input type=\"radio\" name=\"gender\"> Female]{.mark} *— selecting one automatically deselects the other."
      }
    ]
  },
  {
    "day": 5,
    "week": 2,
    "weekTitle": "HTML + CSS",
    "title": "Introduction to CSS",
    "intro": "If HTML is the skeleton of a page, CSS is the outfit and makeup — today we learn how to control colour, fonts, and appearance.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What CSS Does",
        "meaning": "CSS (Cascading Style Sheets) controls how HTML elements look — their colours, fonts, spacing, and how they're arranged on the page.",
        "example": "The exact same HTML page can look completely different — plain and ugly, or polished and modern — depending only on the CSS applied to it."
      },
      {
        "title": "CSS Selectors",
        "meaning": "A selector is how you tell the browser which HTML elements you want to style — by tag name, by class, or by id.",
        "example": "[p { color: grey; }]{.mark} *selects every paragraph on the page and makes its text grey."
      },
      {
        "title": "Classes & IDs in CSS",
        "meaning": "In CSS, a class is targeted with a dot (.warning) and an id is targeted with a hash (#contact-btn) — matching the class or id you gave the element in your HTML.",
        "example": "[.card { border: 1px solid grey; }]{.mark} *styles every element with class=\"card\", while* [#contact-btn { background: blue; }]{.mark} *styles only the one element with id=\"contact-btn\"."
      },
      {
        "title": "Colors",
        "meaning": "The color property sets text colour, and background-color sets the colour behind an element. Colours can be written as names, hex codes, or RGB values.",
        "example": "[color: red;]{.mark} *makes text red.* [background-color: #1F3864;]{.mark} *fills an element with a specific dark navy blue."
      },
      {
        "title": "Fonts",
        "meaning": "The font-family property chooses which typeface text is displayed in, and font-size controls how big it is.",
        "example": "[font-family: \"Calibri\", sans-serif; font-size: 18px;]{.mark} *sets the font to Calibri at 18 pixels tall."
      },
      {
        "title": "Backgrounds",
        "meaning": "The background property (or background-color / background-image) sets what appears behind an element's content — a solid colour or a picture.",
        "example": "[background-color: #F2F2F2;]{.mark} *gives a section a light grey backdrop."
      },
      {
        "title": "Text Styling",
        "meaning": "Properties like font-weight (boldness), text-align (left/centre/right), and text-decoration (underline, etc.) control how text is presented.",
        "example": "[font-weight: bold; text-align: center;]{.mark} *makes text bold and centred."
      },
      {
        "title": "External CSS Files",
        "meaning": "Instead of writing style directly inside HTML tags, it's best practice to put all CSS rules into a separate .css file, linked to your HTML — keeping structure and appearance cleanly separated.",
        "example": "[<link rel=\"stylesheet\" href=\"style.css\">]{.mark} *in your HTML's <head> connects the page to a file named style.css, which holds every style rule for the site."
      }
    ]
  },
  {
    "day": 6,
    "week": 2,
    "weekTitle": "HTML + CSS",
    "title": "CSS Box Model",
    "intro": "Every element on a page is secretly a rectangular box — understanding this \"box model\" is one of the most important skills in CSS.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Width & Height",
        "meaning": "These properties control the size of an element's content area directly.",
        "example": "[width: 300px; height: 200px;]{.mark} *makes a box exactly 300 pixels wide and 200 pixels tall."
      },
      {
        "title": "Margin",
        "meaning": "Empty space outside an element's border, pushing other elements away from it.",
        "example": "Two picture frames on a wall with a gap between them — that gap is margin."
      },
      {
        "title": "Padding",
        "meaning": "Empty space between an element's content and its border — like inner cushioning.",
        "example": "The white cardboard mat between a photograph and its wooden picture frame is padding."
      },
      {
        "title": "Border",
        "meaning": "A visible (or invisible) line drawn around an element, sitting between its padding and its margin.",
        "example": "[border: 2px solid black;]{.mark} *draws a solid black line, 2 pixels thick, around the whole box."
      },
      {
        "title": "box-sizing",
        "meaning": "A setting that decides whether padding and border are added on top of the stated width/height, or counted as part of it. box-sizing: border-box (the common, recommended choice) counts them as part of it, avoiding confusing sizing bugs.",
        "example": "With* [box-sizing: border-box;]{.mark}*, a box set to* [width: 200px]{.mark} *stays exactly 200px wide even after you add padding — nothing overflows unexpectedly."
      },
      {
        "title": "display",
        "meaning": "Decides how a box behaves next to other boxes — for example whether it sits alone on its own line (block) or lines up beside its neighbours (inline, flex, etc.).",
        "example": "[display: block;]{.mark} *makes an element take up its own full line, like a paragraph naturally does."
      }
    ]
  },
  {
    "day": 7,
    "week": 3,
    "weekTitle": "CSS + Responsive Design",
    "title": "Flexbox",
    "intro": "Flexbox is a modern CSS tool for arranging boxes neatly in a row or column, without the messy tricks older CSS required.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "display: flex",
        "meaning": "Turns a container into a \"flex container\" — everything directly inside it instantly becomes much easier to line up and space out.",
        "example": "[.navbar { display: flex; }]{.mark} *lines the navbar's logo and links up neatly in a row instead of stacking on separate lines."
      },
      {
        "title": "flex-direction",
        "meaning": "Decides whether flex children line up left-to-right (row, the default) or top-to-bottom (column).",
        "example": "[flex-direction: column;]{.mark} *stacks items vertically instead of side by side."
      },
      {
        "title": "justify-content",
        "meaning": "Controls spacing along the main direction of the flex container — for example spreading items evenly apart, or centring them.",
        "example": "[justify-content: space-between;]{.mark} *pushes the first item to the left edge and the last item to the right edge, spreading everything in between evenly."
      },
      {
        "title": "align-items",
        "meaning": "Controls positioning across the other direction of the flex container — for example vertically centring items within a row.",
        "example": "[align-items: center;]{.mark} *vertically centres a logo and menu links that happen to be different heights."
      },
      {
        "title": "gap",
        "meaning": "Adds consistent space between flex items, without needing extra margin tricks on each one individually.",
        "example": "[gap: 16px;]{.mark} *puts a clean 16-pixel space between every item in the row, including between the first two and the last two."
      },
      {
        "title": "flex-wrap",
        "meaning": "Decides whether items are forced to squeeze onto one line, or allowed to wrap onto a new line when there isn't enough room.",
        "example": "[flex-wrap: wrap;]{.mark} *lets navigation links drop to a second line on a narrow screen instead of overflowing off the edge."
      }
    ]
  },
  {
    "day": 8,
    "week": 3,
    "weekTitle": "CSS + Responsive Design",
    "title": "Responsive Websites",
    "intro": "\"Responsive\" means a website automatically rearranges itself to look good on any screen size, from a small phone to a big desktop monitor.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Mobile vs Desktop",
        "meaning": "Mobile screens are small and narrow (viewed one-handed, often scrolled with a thumb); desktop screens are wide and give room for multi-column layouts. The same website needs to work well on both.",
        "example": "A three-column product grid on desktop might need to become a single column on mobile so nothing gets squeezed unreadably small."
      },
      {
        "title": "Responsive Design",
        "meaning": "The overall practice of building a website so its layout automatically adjusts to fit the visitor's screen size, instead of forcing one fixed layout on everyone.",
        "example": "Resize any modern news website's browser window — the layout visibly reflows as you drag it narrower."
      },
      {
        "title": "Media Queries",
        "meaning": "A CSS rule that says \"only apply these styles when the screen is narrower/wider than a certain size.\" This is the main tool responsive design is built on.",
        "example": "[\\@media (min-width: 768px) { .container { display: flex; } }]{.mark} *switches to a side-by-side layout only once the screen is at least 768 pixels wide."
      },
      {
        "title": "Mobile-First Thinking",
        "meaning": "A design habit of styling the small-screen version first (since it's simplest), then adding extra rules for bigger screens as more room becomes available.",
        "example": "Write your single-column phone layout as the default CSS, then use a media query to switch to a multi-column layout only for wider screens."
      },
      {
        "title": "Responsive Images",
        "meaning": "Images that shrink or grow along with their container, instead of staying a fixed size and breaking the layout.",
        "example": "[img { max-width: 100%; height: auto; }]{.mark} *stops any image from ever overflowing wider than its container."
      },
      {
        "title": "Responsive Navigation",
        "meaning": "A navigation menu that changes its presentation on smaller screens — commonly collapsing into a \"hamburger\" icon (☰) instead of showing every link across the top.",
        "example": "On your phone, most websites hide their full menu behind a ☰ icon that expands into a list when tapped."
      }
    ]
  },
  {
    "day": 9,
    "week": 3,
    "weekTitle": "CSS + Responsive Design",
    "title": "HTML + CSS Mini Project — Responsive Landing Page",
    "intro": "Today is a checkpoint, not new theory — everything from Weeks 1 to 3 comes together into one real page: a \"landing page\" designed to introduce something and push a visitor toward one specific action.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Navigation",
        "meaning": "The menu bar at the very top of the page, usually holding a logo and links to the page's main sections.",
        "example": "Logo on the left, links to \"Features\", \"About\", and \"Contact\" on the right, using the flexbox skills from Day 7."
      },
      {
        "title": "Hero Section",
        "meaning": "The big, eye-catching block right below the navigation — usually a headline, a short description, and sometimes an image. It's the first thing anyone sees.",
        "example": "A large heading like \"Great Coffee, Delivered Fresh\" with a short sentence underneath and a photo of a coffee cup."
      },
      {
        "title": "Features Section",
        "meaning": "Short blocks explaining what's on offer, usually laid out as several repeating cards.",
        "example": "Three cards side by side: \"Fast Delivery\", \"Freshly Roasted\", \"Eco-Friendly Packaging\", each with a short one-line description."
      },
      {
        "title": "About Section",
        "meaning": "A block giving background or credibility — who is behind this, or why it can be trusted.",
        "example": "A short paragraph: \"We've been roasting coffee in Lagos since 2019...\""
      },
      {
        "title": "Call-to-Action (CTA)",
        "meaning": "A clearly visible button pushing the visitor to take the one action the page wants them to take.",
        "example": "A large button reading \"Order Now\" or \"Sign Up Free\", styled to stand out from the rest of the page."
      },
      {
        "title": "Footer",
        "meaning": "The bottom section of the page, usually holding copyright text, contact details, or links to social media.",
        "example": "\"© 2026 My Coffee Shop — Contact us: hello@example.com\""
      },
      {
        "title": "Making At Least 5 Real Changes Yourself",
        "meaning": "After AI generates the full page, you must open the code and personally change at least five things — proving you understand it rather than just copy-pasting a result you don't understand.",
        "example": "Changing the hero headline text, the CTA button's colour, the number of feature cards, the heading font, and the footer's copyright year — all edited by you, not AI."
      }
    ]
  },
  {
    "day": 10,
    "week": 4,
    "weekTitle": "JavaScript Fundamentals",
    "title": "JavaScript Basics",
    "intro": "If HTML is structure and CSS is appearance, JavaScript is behaviour — today we write our first lines of it.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What JavaScript Does",
        "meaning": "JavaScript is the language that makes a page interactive — things like a button that actually does something when clicked, or a page that updates itself without reloading.",
        "example": "Without JavaScript, a \"Like\" button on a page could look clickable but would never actually change the number next to it."
      },
      {
        "title": "Connecting JavaScript to HTML",
        "meaning": "A JavaScript file is linked to an HTML page using a <script> tag, so the browser knows to run that code alongside the page.",
        "example": "[<script src=\"app.js\"></script>]{.mark} *placed near the bottom of the HTML tells the browser to load and run app.js."
      },
      {
        "title": "Variables: let",
        "meaning": "A variable is a labelled box that stores a piece of information so you can use it later. \"let\" creates a box whose contents can be changed later.",
        "example": "[let age = 25;]{.mark} *then later* [age = 26;]{.mark} *— the value inside age is allowed to change."
      },
      {
        "title": "Variables: const",
        "meaning": "\"const\" creates a variable whose value cannot be reassigned once set. Use const by default, and only switch to let when you know the value needs to change.",
        "example": "[const name = \"Ada\";]{.mark} *— trying to write* [name = \"Bola\";]{.mark} *afterward would cause an error."
      },
      {
        "title": "Strings",
        "meaning": "A string is text data, always wrapped in quotes.",
        "example": "[\"Hello, world!\"]{.mark} *and* ['Ada']{.mark} *are both strings."
      },
      {
        "title": "Numbers",
        "meaning": "A number is numeric data, written without quotes.",
        "example": "[const age = 25;]{.mark} *— no quotes, because 25 is a number, not text."
      },
      {
        "title": "Booleans",
        "meaning": "A boolean is a simple true/false value, used for yes/no decisions.",
        "example": "[const isLoggedIn = true;]{.mark} *stores a value that can only ever be true or false."
      },
      {
        "title": "console.log()",
        "meaning": "A command that prints information into the browser's hidden \"developer console\". It doesn't show up on the actual page, but it's the most useful tool for peeking inside your code while building or debugging.",
        "example": "[console.log(name);]{.mark} *prints the current value of name into the console so you can double-check it holds what you expect."
      },
      {
        "title": "Basic Operators",
        "meaning": "Symbols used to do maths or combine values: + (add or join text), - (subtract), * (multiply), / (divide).",
        "example": "[const total = 10 + 5;]{.mark} *gives 15.* [const greeting = \"Hello \" + name;]{.mark} *joins two pieces of text together."
      }
    ]
  },
  {
    "day": 11,
    "week": 4,
    "weekTitle": "JavaScript Fundamentals",
    "title": "Conditions + Logic",
    "intro": "Conditions let your code make decisions, the same way you make decisions in real life based on a situation.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "if / else / else if",
        "meaning": "\"if\" runs a block of code only when something is true. \"else\" provides a fallback for when it isn't. \"else if\" lets you check several different situations in order.",
        "example": "[if (age >= 18) { console.log(\"You can register.\"); } else { console.log(\"Sorry, you must be 18 or older.\"); }]{.mark}"
      },
      {
        "title": "Comparison Operators",
        "meaning": "Symbols used to compare two values: === (exactly equal to), !== (not equal to), > (greater than), < (less than), >= and <=.",
        "example": "[age >= 18]{.mark} *checks whether age is 18 or more, producing true or false."
      },
      {
        "title": "Logical Operators",
        "meaning": "&& means \"and\" (both conditions must be true), \\|\\| means \"or\" (at least one must be true), and ! means \"not\" (flips true to false, and vice versa).",
        "example": "[if (age >= 18 && hasID) { ... }]{.mark} *only runs if the visitor is both old enough AND has an ID."
      },
      {
        "title": "switch",
        "meaning": "A tidier alternative to writing many else-if checks in a row, used when you're comparing one single value against several specific possibilities.",
        "example": "[switch (day) { case \"Mon\": console.log(\"Start of week\"); break; case \"Fri\": console.log(\"Almost weekend\"); break; }]{.mark}"
      }
    ]
  },
  {
    "day": 12,
    "week": 4,
    "weekTitle": "JavaScript Fundamentals",
    "title": "Functions",
    "intro": "A function is a reusable, named block of instructions you can run whenever you need it, instead of retyping the same code over and over.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What Functions Are",
        "meaning": "Think of a function as a mini-machine: you feed something in, it does a job, and it can hand something back out.",
        "example": "A function called calculateTotal could take three prices and hand back their sum."
      },
      {
        "title": "Parameters",
        "meaning": "The placeholder names listed when you create a function — describing what inputs it's designed to accept.",
        "example": "In* [function calculateTotal(price1, price2, price3)]{.mark}*, price1, price2, and price3 are the parameters."
      },
      {
        "title": "Arguments",
        "meaning": "The actual values you feed into a function when you use (\"call\") it.",
        "example": "Calling* [calculateTotal(10, 20, 5)]{.mark} *— the numbers 10, 20, and 5 are the arguments."
      },
      {
        "title": "return Values",
        "meaning": "The result a function sends back to whoever called it, which you can then store in a variable or use elsewhere.",
        "example": "[function calculateTotal(a, b, c) { return a + b + c; }]{.mark} *— calling it returns the sum, ready to be stored:* [const total = calculateTotal(10, 20, 5);]{.mark}"
      },
      {
        "title": "Arrow Functions",
        "meaning": "A shorter, more modern way of writing functions using =>. This has become the standard style in most JavaScript code today, including almost everything AI tools generate.",
        "example": "[const calculateTotal = (a, b, c) => a + b + c;]{.mark} *does exactly the same job as the longer function written above."
      }
    ]
  },
  {
    "day": 13,
    "week": 5,
    "weekTitle": "JavaScript Data + DOM",
    "title": "Arrays",
    "intro": "An array is an ordered list of values stored in one variable — useful any time you have more than one of something.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What Arrays Are",
        "meaning": "A list of values written inside square brackets, kept in a specific order.",
        "example": "[const shoppingList = \\[\"milk\", \"eggs\", \"bread\"\\];]{.mark} *stores three items in order."
      },
      {
        "title": "Accessing Items (Index)",
        "meaning": "Each item in an array has a position number called an \"index\", starting from 0, not 1. So the first item is at index 0.",
        "example": "[shoppingList\\[0\\]]{.mark} *gives you \"milk\", the first item.* [shoppingList\\[2\\]]{.mark} *gives you \"bread\"."
      },
      {
        "title": ".length",
        "meaning": "Tells you how many items are currently in the array.",
        "example": "[shoppingList.length]{.mark} *gives you 3 for a list of three items."
      },
      {
        "title": "push()",
        "meaning": "Adds a new item to the end of the array.",
        "example": "[shoppingList.push(\"butter\");]{.mark} *turns \\[\"milk\", \"eggs\", \"bread\"\\] into \\[\"milk\", \"eggs\", \"bread\", \"butter\"\\]."
      },
      {
        "title": "pop()",
        "meaning": "Removes the last item from the array.",
        "example": "[shoppingList.pop();]{.mark} *removes \"butter\", leaving \\[\"milk\", \"eggs\", \"bread\"\\]."
      },
      {
        "title": "shift()",
        "meaning": "Removes the first item from the array.",
        "example": "[shoppingList.shift();]{.mark} *removes \"milk\", leaving \\[\"eggs\", \"bread\"\\]."
      },
      {
        "title": "unshift()",
        "meaning": "Adds a new item to the very beginning of the array.",
        "example": "[shoppingList.unshift(\"juice\");]{.mark} *turns \\[\"eggs\", \"bread\"\\] into \\[\"juice\", \"eggs\", \"bread\"\\]."
      },
      {
        "title": "splice()",
        "meaning": "A more flexible tool that can remove and/or insert items at any position in the middle of the array.",
        "example": "[shoppingList.splice(1, 1, \"cheese\")]{.mark} *removes 1 item starting at index 1 and inserts \"cheese\" in its place."
      }
    ]
  },
  {
    "day": 14,
    "week": 5,
    "weekTitle": "JavaScript Data + DOM",
    "title": "Objects",
    "intro": "While an array is a simple ordered list, an object stores information as labelled pairs — similar to filling out a form with labelled fields.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What Objects Are",
        "meaning": "A way to represent something with multiple pieces of information, written with curly braces, storing named \"property: value\" pairs.",
        "example": "[const product = { name: \"Notebook\", price: 5, category: \"Stationery\" };]{.mark} *describes one product with three properties."
      },
      {
        "title": "Properties & Values",
        "meaning": "A property is the label (like name or price); the value is what's stored under that label.",
        "example": "In* [{ name: \"Notebook\", price: 5 }]{.mark}*, name and price are properties; \"Notebook\" and 5 are their values."
      },
      {
        "title": "Accessing Properties",
        "meaning": "You read a property's value using a dot between the object and the property name.",
        "example": "[product.name]{.mark} *gives you \"Notebook\".* [product.price]{.mark} *gives you 5."
      },
      {
        "title": "Updating Properties",
        "meaning": "You change a property's value the same way you'd update a variable, using the dot to target it.",
        "example": "[product.price = 6;]{.mark} *changes the notebook's price from 5 to 6."
      },
      {
        "title": "Arrays of Objects",
        "meaning": "A list where each item is itself an object with several properties — exactly how real-world data (like a product catalogue) is normally represented.",
        "example": "[const products = \\[ { name: \"Notebook\", price: 5 }, { name: \"Pen\", price: 1 } \\];]{.mark} *—* [products\\[0\\].name]{.mark} *gives \"Notebook\",* [products\\[1\\].price]{.mark} *gives 1."
      }
    ]
  },
  {
    "day": 15,
    "week": 5,
    "weekTitle": "JavaScript Data + DOM",
    "title": "Introduction to the DOM & HTML Interaction",
    "intro": "This is one of the most important ideas in the whole course — how JavaScript actually reaches into a live page and changes it.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What the DOM Is",
        "meaning": "The DOM (Document Object Model) is the browser's live, in-memory copy of your HTML page — a map of every element on the page that JavaScript can read and change while the page is running, without reloading it.",
        "example": "When JavaScript changes a heading's text without the page flashing or reloading, it's editing the DOM directly."
      },
      {
        "title": "querySelector() / querySelectorAll()",
        "meaning": "Commands that let JavaScript \"find\" elements on the page using the same kind of selectors as CSS (tag, class, or id). querySelector() finds the first match; querySelectorAll() finds every match.",
        "example": "[document.querySelector(\".card\")]{.mark} *finds the first element with class=\"card\".* [document.querySelectorAll(\".card\")]{.mark} *finds all of them."
      },
      {
        "title": "getElementById()",
        "meaning": "Finds the one specific element with a given id — fast and precise since ids are always unique.",
        "example": "[document.getElementById(\"greeting\")]{.mark} *finds the element written as* [<h1 id=\"greeting\">]{.mark}*."
      },
      {
        "title": ".textContent",
        "meaning": "Reads or updates the visible text inside an element found via the DOM.",
        "example": "[document.getElementById(\"greeting\").textContent = \"You clicked it!\";]{.mark} *swaps the heading's text instantly."
      },
      {
        "title": ".value",
        "meaning": "Reads or updates what's currently typed into a form input.",
        "example": "[document.getElementById(\"email\").value]{.mark} *reads whatever the visitor has typed into the email box."
      },
      {
        "title": ".style",
        "meaning": "Lets JavaScript change an element's CSS directly (like colour or size) on the fly, while the page is running.",
        "example": "[box.style.backgroundColor = \"red\";]{.mark} *instantly turns that box's background red."
      }
    ]
  },
  {
    "day": 16,
    "week": 6,
    "weekTitle": "Events + APIs + .env + Debugging",
    "title": "Events",
    "intro": "An \"event\" is anything that happens on the page that JavaScript can react to — a click, typing into a box, submitting a form, and so on.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "addEventListener()",
        "meaning": "The standard command for telling an element \"watch for this specific type of event, and when it happens, run this function.\"",
        "example": "[button.addEventListener(\"click\", function() { alert(\"Clicked!\"); });]{.mark} *runs the alert every time this button is clicked."
      },
      {
        "title": "click",
        "meaning": "An event that fires when an element is clicked with the mouse (or tapped on a touchscreen). Most often used on buttons.",
        "example": "[addBtn.addEventListener(\"click\", addTask);]{.mark} *runs the addTask function whenever addBtn is clicked."
      },
      {
        "title": "submit",
        "meaning": "An event that fires when a form is submitted.",
        "example": "[form.addEventListener(\"submit\", handleSubmit);]{.mark} *runs handleSubmit whenever the form is submitted."
      },
      {
        "title": "input",
        "meaning": "An event that fires as something is being typed, checked live as each keystroke happens.",
        "example": "[searchBox.addEventListener(\"input\", filterResults);]{.mark} *re-filters results on every single keystroke as the visitor types."
      },
      {
        "title": "change",
        "meaning": "An event that fires when a value is changed and then confirmed — like leaving a dropdown after picking an option.",
        "example": "[countrySelect.addEventListener(\"change\", updateFlag);]{.mark} *runs updateFlag once a new country is actually selected."
      },
      {
        "title": "preventDefault()",
        "meaning": "A command used inside an event handler to switch off an element's default browser behaviour — most commonly, stopping a form from reloading the whole page when submitted.",
        "example": "[form.addEventListener(\"submit\", function(event) { event.preventDefault(); /* handle it yourself */ });]{.mark}"
      }
    ]
  },
  {
    "day": 17,
    "week": 6,
    "weekTitle": "Events + APIs + .env + Debugging",
    "title": "APIs with JavaScript",
    "intro": "Today's topic is how your code can talk to the internet and fetch real, live data.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What an API Is",
        "meaning": "An API (Application Programming Interface) is a way for one piece of software to ask another piece of software for information or to trigger an action.",
        "example": "A weather app asking a weather service \"what's the temperature in Lagos right now?\" and getting an answer back is an API in action."
      },
      {
        "title": "HTTP Requests",
        "meaning": "The standard way computers exchange messages over the internet — the \"conversation\" your code has with an API.",
        "example": "Every time your browser loads a page or an app fetches data, it's making an HTTP request behind the scenes."
      },
      {
        "title": "fetch()",
        "meaning": "The built-in JavaScript command used to actually send a request to an API from your own code.",
        "example": "[fetch(\"https://example-api.com/joke\")]{.mark} *sends a request asking that address for data."
      },
      {
        "title": "GET",
        "meaning": "The most common type of HTTP request — it simply asks for information without changing anything on the server.",
        "example": "Fetching today's weather uses a GET request — you're only reading data, not changing anything."
      },
      {
        "title": "JSON",
        "meaning": "JSON (JavaScript Object Notation) is the format data sent back from APIs almost always arrives in — it looks nearly identical to the JavaScript objects and arrays you already know, just written as text.",
        "example": "A weather API might respond with* [{ \"city\": \"Lagos\", \"temperature\": 30 }]{.mark} *— plain JSON that your code can read like an object."
      },
      {
        "title": "async/await",
        "meaning": "Because a request has to travel across the internet and back, it takes time. async/await is the modern way JavaScript lets your code \"wait\" for that response to arrive before continuing, without freezing the page.",
        "example": "[async function getJoke() { const response = await fetch(url); const data = await response.json(); }]{.mark} *— each await pauses just that function until its step finishes."
      },
      {
        "title": "Handling Errors",
        "meaning": "Planning for things going wrong — a slow connection, a wrong address, or a server error — so your app doesn't silently break.",
        "example": "Wrapping a fetch() call in a try/catch block so that if the request fails, you can show the visitor a friendly \"Something went wrong, try again\" message instead of a blank screen."
      }
    ]
  },
  {
    "day": 18,
    "week": 6,
    "weekTitle": "Events + APIs + .env + Debugging",
    "title": ".env, API Keys & Debugging",
    "intro": "Today covers two very different but equally important survival skills: keeping secrets safe, and fixing things when they break.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Environment Variables",
        "meaning": "Values (often secrets) stored separately from your main code, so they're not scattered all over your project and can be swapped easily between setups.",
        "example": "Storing a weather API's key as an environment variable instead of typing it directly inside your JavaScript file."
      },
      {
        "title": "Why API Keys Must Be Protected",
        "meaning": "An API key is a private password-like code that identifies you. If it falls into the wrong hands, someone else could use it under your name — running up charges or causing damage.",
        "example": "A leaked API key posted publicly on GitHub can be found and abused by strangers within minutes."
      },
      {
        "title": ".env Files",
        "meaning": "A special file used to store secret values like API keys, kept separate from your main code.",
        "example": "A .env file might contain one line:* [WEATHER_API_KEY=abc123secret]{.mark}"
      },
      {
        "title": ".gitignore",
        "meaning": "A file that tells Git which files to never upload to GitHub. Your .env file should always be listed here.",
        "example": "Adding the line* [.env]{.mark} *inside your .gitignore file stops Git from ever including it when you push your project."
      },
      {
        "title": "Frontend vs Backend Secrets",
        "meaning": "If your JavaScript runs directly in the visitor's browser (frontend), putting a real secret key in a .env file does NOT actually keep it safe — anything sent to the browser can be seen by a technically curious visitor. True secrets need a small backend/server piece that only your server talks to directly.",
        "example": "For a real project with a real secret key, the fetch() call to the API should be made from a small backend server, not directly from the visitor's browser."
      },
      {
        "title": "Debugging With AI",
        "meaning": "When something breaks, read the error message in the developer console carefully first. When asking AI for help, ask a specific question like \"explain this error and tell me which line is causing it\" rather than \"fix everything\" — the first approach helps you learn, the second hides the problem from you.",
        "example": "Instead of pasting your whole file and saying \"fix it\", copy just the error message and the relevant few lines, and ask: \"What does this error mean, and which line is the problem?\""
      }
    ]
  },
  {
    "day": 19,
    "week": 7,
    "weekTitle": "Classes + AI-Assisted Development",
    "title": "Classes & Object-Oriented JavaScript",
    "intro": "A class is a template or blueprint for creating objects that share the same shape and behaviour, so you don't have to write each one out by hand.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What a Class Is",
        "meaning": "A blueprint you define once, then use to quickly create as many similar objects as you need.",
        "example": "[class Product { ... }]{.mark} *defines the blueprint for what every product in your app will look like."
      },
      {
        "title": "constructor",
        "meaning": "A special function inside a class that runs automatically whenever a new object is created from it, used to set up its starting properties.",
        "example": "[constructor(name, price) { this.name = name; this.price = price; }]{.mark} *sets each new product's name and price as soon as it's created."
      },
      {
        "title": "Properties & Methods",
        "meaning": "Properties are the data a class's objects hold (like name or price). Methods are functions attached to a class describing what its objects can do.",
        "example": "A Product class might have properties name and price, plus a method describe() that returns a sentence about the product."
      },
      {
        "title": "this",
        "meaning": "Inside a class, \"this\" refers to \"the specific object currently being worked with\" — how a method knows whose data to use.",
        "example": "In* [describe() { return this.name + \" costs \\$\" + this.price; }]{.mark}*, this.name refers to that particular product's own name."
      },
      {
        "title": "new",
        "meaning": "The keyword used to actually create (\"instantiate\") a real object from a class blueprint.",
        "example": "[const pen = new Product(\"Pen\", 1);]{.mark} *creates one real product object from the Product blueprint."
      },
      {
        "title": "extends",
        "meaning": "Lets one class inherit the properties and methods of another, avoiding repeated code for closely related things. At this beginner stage, just recognise this pattern when AI generates it.",
        "example": "[class DigitalProduct extends Product { ... }]{.mark} *would let DigitalProduct reuse everything Product already has, and add its own extras."
      }
    ]
  },
  {
    "day": 20,
    "week": 7,
    "weekTitle": "Classes + AI-Assisted Development",
    "title": "Building With APIs + AI",
    "intro": "Today, everything from the last six weeks combines into a real, working mini-application built around a public API.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Choosing a Project",
        "meaning": "Pick a small project idea that fetches and displays live data from a public API — like current weather, a movie search, or a random joke.",
        "example": "Examples: a weather app, a movie search app, a GitHub profile finder, a recipe finder, a country information app, or a joke generator."
      },
      {
        "title": "Understanding API Documentation With AI",
        "meaning": "Ask AI to explain a public API's documentation to you in plain terms — what information it needs, and what it sends back — before you start writing code.",
        "example": "\"Here is this API's documentation page — explain in plain English what URL I need to call and what the response will look like.\""
      },
      {
        "title": "Generating a First Version",
        "meaning": "Ask AI to build a first, working draft of your project so you have a real starting point to read and learn from.",
        "example": "\"Build a simple joke generator using this joke API, with a button to fetch a new joke.\""
      },
      {
        "title": "Reading, Testing & Finding Errors",
        "meaning": "Read the generated code line by line so you understand what each part does, run it, test it with different inputs, and look for anything that breaks or behaves oddly — before making any changes yourself.",
        "example": "Trace through the code and confirm you can identify: the fetch() call, where the JSON is unpacked, the DOM code that displays it, and the button's event listener that starts it all."
      }
    ]
  },
  {
    "day": 21,
    "week": 7,
    "weekTitle": "Classes + AI-Assisted Development",
    "title": "Modify & Debug AI-Generated Code",
    "intro": "Today is a deliberate challenge day — practising the skill of changing code you didn't originally write.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Changing the UI",
        "meaning": "Editing what the page looks like — colours, spacing, layout — using your CSS knowledge.",
        "example": "Changing the joke generator's button colour and rounding its corners."
      },
      {
        "title": "Adding or Removing Features",
        "meaning": "Adding something new the project didn't have, or removing something it doesn't need, by editing the HTML, CSS, and JavaScript together.",
        "example": "Adding a \"Copy Joke\" button next to the existing \"New Joke\" button."
      },
      {
        "title": "Input Validation",
        "meaning": "Checks that stop a form from being submitted with missing or incorrect information, like an empty email field.",
        "example": "[if (emailInput.value === \"\") { alert(\"Please enter an email.\"); return; }]{.mark} *stops submission if the field is empty."
      },
      {
        "title": "Asking AI Targeted Questions",
        "meaning": "Try a fix yourself first, using what you've learned. Only turn to AI when stuck, and ask a specific question about the exact problem rather than a vague \"fix it\" request.",
        "example": "Instead of \"add validation\", ask: \"My form still submits even when the email input is empty — here is my submit listener, what's wrong with my condition?\""
      }
    ]
  },
  {
    "day": 22,
    "week": 8,
    "weekTitle": "Final Project",
    "title": "Final Project Planning",
    "intro": "Good software starts with good planning, not with typing code immediately — this is true whether you're coding by hand or working with AI.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Choosing a Project",
        "meaning": "Pick a final project you'll build over the next few classes, sized so you can realistically finish it.",
        "example": "Examples: a to-do app, calculator, quiz, expense tracker, portfolio, product page, student management app, or recipe app."
      },
      {
        "title": "Planning Features",
        "meaning": "Deciding exactly what your project needs to be able to do, written out as a clear list before building anything.",
        "example": "For a to-do app: add a task, mark a task complete, delete a task, and see how many tasks remain."
      },
      {
        "title": "Writing a Clear AI Prompt",
        "meaning": "Describing your project to AI the way you'd brief a new team member — stating the goal, specific features, design preferences, and any constraints. A vague prompt produces vague, generic results.",
        "example": "\"Build a to-do list web app with HTML, CSS and JavaScript. Users can add a task, mark it complete, and delete it. Use a clean, minimal design in a single centred card. It must work on mobile and desktop.\""
      },
      {
        "title": "Setting Up Project Structure",
        "meaning": "Organising your project's files sensibly before diving into code — separate files for HTML, CSS, and JavaScript, in a clearly named folder.",
        "example": "A folder named todo-app containing index.html, style.css, and script.js."
      }
    ]
  },
  {
    "day": 23,
    "week": 8,
    "weekTitle": "Final Project",
    "title": "Build Final Project",
    "intro": "This is the main build day, where yesterday's plan becomes real, working code.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Building With HTML, CSS & JavaScript Together",
        "meaning": "Bringing together structure, appearance, and behaviour — the three languages from the whole course — into one working project.",
        "example": "Building the to-do app's HTML layout first, then styling it with CSS, then adding the add/complete/delete behaviour with JavaScript."
      },
      {
        "title": "API Integration (Where Needed)",
        "meaning": "Connecting your project to a public API if it needs live outside data, using the fetch() and JSON skills from Day 17.",
        "example": "A recipe app fetching a list of recipes from a public recipes API based on what the visitor searches for."
      },
      {
        "title": "Using AI as a Development Partner",
        "meaning": "Generate pieces, read them, test them immediately, and fix or adjust as you go — rather than generating the whole project at once and hoping it all works.",
        "example": "Ask AI to generate just the \"add task\" feature, test it thoroughly, then move on to asking for \"delete task\" separately."
      },
      {
        "title": "Testing As You Build",
        "meaning": "Actually using your own app the way a real visitor would — clicking every button, trying correct and incorrect input, resizing the window — to catch problems early.",
        "example": "After adding the \"delete task\" feature, immediately click delete on a few different tasks to confirm the right one disappears every time."
      }
    ]
  },
  {
    "day": 24,
    "week": 8,
    "weekTitle": "Final Project",
    "title": "Complete & Prepare Project",
    "intro": "Today is about polish and quality control — just as important as building the features in the first place.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Responsive Design Pass",
        "meaning": "A dedicated check that the layout genuinely works well on both phone-sized and desktop-sized screens, not just \"technically doesn't break\".",
        "example": "Shrinking the browser window down to phone width and confirming nothing overlaps or gets cut off."
      },
      {
        "title": "Fixing Bugs",
        "meaning": "Hunting for and fixing any remaining unexpected behaviour, broken buttons, or ugly overlaps.",
        "example": "Noticing the \"delete\" button sometimes deletes the wrong task, and tracing through the code to find and fix the mistake."
      },
      {
        "title": "Cleaning Up Code",
        "meaning": "Removing leftover test code, fixing inconsistent naming, and adding a few comments explaining anything non-obvious.",
        "example": "Deleting a forgotten* [console.log(\"test\")]{.mark} *line, and renaming a variable called* [x]{.mark} *to something clearer like* [taskCount]{.mark}*."
      },
      {
        "title": "Preparing for Git",
        "meaning": "Making sure nothing secret (like a real .env file) is left in a place where it would accidentally get uploaded, before sharing the project through Git.",
        "example": "Double-checking .gitignore lists .env before running your first git add."
      }
    ]
  },
  {
    "day": 25,
    "week": 9,
    "weekTitle": "Git, GitHub & Vercel",
    "title": "Git & GitHub",
    "intro": "Today's topic is how to save your project's history and back it up online, safely.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What Git Is",
        "meaning": "A tool that tracks every change you make to your project over time, like a detailed undo history you can label and describe, letting you go back to an earlier working version if something breaks.",
        "example": "If a change breaks your app, Git lets you look back through your history and see exactly what changed and when."
      },
      {
        "title": "What GitHub Is",
        "meaning": "A website that stores your Git-tracked projects online, so you can back them up, share them, or work on them with other people.",
        "example": "Uploading your to-do app to GitHub gives it a public (or private) home online with a shareable link."
      },
      {
        "title": "git init / add / commit / push",
        "meaning": "git init starts tracking a new project. git add . stages your changes (marks them ready to save). git commit -m \"message\" saves a snapshot with a short description. git push uploads your saved snapshots to GitHub.",
        "example": "[git init]{.mark}*, then* [git add .]{.mark}*, then* [git commit -m \"Initial project\"]{.mark}*, then* [git push]{.mark} *— the standard first-time sequence."
      },
      {
        "title": "Creating a GitHub Repository",
        "meaning": "A \"repository\" (or \"repo\") is the project's home on GitHub. You create an empty one on GitHub's website, then connect your local project to it.",
        "example": "Creating a repo named \"todo-app\" on GitHub, then linking your local folder to it so* [git push]{.mark} *knows where to upload."
      },
      {
        "title": ".gitignore & .env Safety",
        "meaning": "As covered on Day 18, your .gitignore file must list .env — pushing a real secret key to a shared GitHub repository is one of the most common and costly beginner mistakes.",
        "example": "Before your very first push, opening .gitignore and confirming the line* [.env]{.mark} *is there."
      }
    ]
  },
  {
    "day": 26,
    "week": 9,
    "weekTitle": "Git, GitHub & Vercel",
    "title": "Vercel Deployment",
    "intro": "Today, your project goes from \"only works on my computer\" to \"has a real address anyone in the world can visit.\"",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "What Hosting Is",
        "meaning": "Putting your project's files on a computer that's always connected to the internet, so anyone can visit it through a web address. Your own laptop isn't suitable, since it isn't always switched on and connected.",
        "example": "A hosted website stays online even while your own laptop is switched off."
      },
      {
        "title": "What Deployment Means",
        "meaning": "The act of publishing your latest version to a hosting service so the public copy matches what you've built.",
        "example": "Every time you deploy, the live website updates to match your newest code."
      },
      {
        "title": "What Vercel Is",
        "meaning": "A popular, beginner-friendly hosting service built especially for exactly this kind of project — it can connect directly to your GitHub account, detect your project automatically, and publish it in a few clicks.",
        "example": "Connecting your GitHub account to Vercel and clicking \"Deploy\" gives you a live address like your-project.vercel.app within minutes."
      },
      {
        "title": "Environment Variables on Vercel",
        "meaning": "Since your real .env file was deliberately never pushed to GitHub, you re-enter those same secret values directly inside Vercel's own settings — so your live site can access secrets without them ever being visible in your public repository.",
        "example": "Adding* [WEATHER_API_KEY=abc123]{.mark} *inside Vercel's \"Environment Variables\" settings, matching your local .env file exactly."
      },
      {
        "title": "Local vs Production",
        "meaning": "\"Local\" is the version running only on your own computer while you build. \"Production\" is the live, public version real people can visit. If the live site doesn't behave like your local version, missing environment variables are one of the most common causes.",
        "example": "Your weather app works locally but shows no data live — the first thing to check is whether the API key was added to Vercel's environment variables too."
      }
    ]
  },
  {
    "day": 27,
    "week": 9,
    "weekTitle": "Git, GitHub & Vercel",
    "title": "Ship & Maintain",
    "intro": "The final class proves the whole pipeline works end to end, and celebrates finishing the course.",
    "concepts": [
      {
        "title": "LESSON OVERVIEW — by the end of this class you will be able to:",
        "meaning": "",
        "example": ""
      },
      {
        "title": "Testing the Live Website",
        "meaning": "Trying out your live website thoroughly, the way a stranger visiting it for the first time would.",
        "example": "Clicking every button and filling in every form on your live, public URL, not just your local version."
      },
      {
        "title": "Push → Auto Redeploy",
        "meaning": "Making a small real change locally, committing it, and pushing it to GitHub — Vercel automatically detects that push and redeploys your site, with no manual re-uploading needed.",
        "example": "Change your footer text, run* [git add .]{.mark}*,* [git commit -m \"Update footer text\"]{.mark}*,* [git push]{.mark} *— within about a minute, your live site shows the new text."
      },
      {
        "title": "Production vs Development",
        "meaning": "\"Development\" is your local, in-progress version, where mistakes are safe and expected. \"Production\" is the live, public version, where you want to be more careful.",
        "example": "Testing a risky new feature locally (development) before ever pushing it live (production)."
      },
      {
        "title": "Final Project Presentation",
        "meaning": "Presenting your finished project: what you built, what AI generated for you, what you personally changed or fixed, what problems you ran into, how you solved them, and one specific piece of code you can genuinely explain in your own words.",
        "example": "Standing up and explaining: \"AI generated my first draft, but I personally fixed a bug where deleting one task deleted the wrong one — here's the line I changed and why.\""
      }
    ]
  }
];


// Course-level intro content (title, goal, path ahead, how to use these
// notes) -- everything in the source doc BEFORE "Week 1" starts. Shown
// once at the top of the Notes page, always visible regardless of which
// days are locked/unlocked, since it's orientation, not lesson content.
export const FOUNDATIONS_INTRO = {
  "title": "MarTech Training",
  "subtitle": "Stage 1 Course Notes",
  "tagline": "HTML, CSS, JavaScript + AI — From Zero to Shipped Project",
  "meta": [
    "Duration: 9 Weeks",
    "Schedule: 3 classes per week",
    "Class length: 1 hour 30 minutes",
    "Total: 27 classes — 40.5 hours"
  ],
  "sections": [
    {
      "heading": "Course Goal",
      "body": "This course teaches you enough HTML, CSS and JavaScript that when an AI tool (like ChatGPT or Claude) writes code for you, you can read it, understand it, test it, fix it when it breaks, and change it to do what you actually want. By the end, you will have planned, built, debugged, and published a real website online."
    },
    {
      "heading": "Why We Learn the Fundamentals Before Leaning on AI",
      "body": "Some people believe you can skip straight to prompting AI and start shipping finished websites. So why does this course spend eight weeks on HTML, CSS and JavaScript fundamentals before treating AI as a full development partner? Because AI-generated code is still code — and when (not if) something in your project breaks, you need to be able to read the error, find the exact line causing it, and understand why. Without a real grounding in the fundamentals, every bug becomes a mystery you can only solve by pasting error messages back into a chat window and hoping for the best. Beyond that, the moment you want your project to do something even slightly different from what a tutorial or a single AI prompt shows you, you will hit a wall — unless you understand the language well enough to bend it yourself. The time you would otherwise spend endlessly re-prompting AI and guessing at fixes is better spent learning the fundamentals now, once, properly."
    },
    {
      "heading": "The Path Ahead",
      "bullets": [
        "In Week 1, you'll learn the absolute basics of how the web works and how to structure a page with HTML.",
        "In Weeks 2 and 3, you'll learn CSS — how to make that structure look good, and how to make it adapt automatically to any screen size.",
        "In Weeks 4 and 5, you'll learn JavaScript fundamentals and how to connect your code to a live page through the DOM.",
        "In Week 6, you'll learn how pages talk to the internet through APIs, and how to handle secrets like API keys safely.",
        "In Week 7, you'll bring classes and full AI-assisted building together into your first real, working mini-applications.",
        "In Week 8, you'll plan, build, and polish one complete final project from scratch.",
        "In Week 9, you'll learn Git, GitHub, and how to deploy your project live on the internet with Vercel."
      ]
    },
    {
      "heading": "How These Notes Teach You",
      "body": "How to use these notes: each class is broken down into the individual topics taught that day. Every topic has its own card with three parts — the topic name, what it Means in plain English, and a worked Example showing it in real use. Read one card at a time. Do not move to the next card until the current one makes sense to you."
    }
  ]
};
