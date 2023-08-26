const puppeteer = require('puppeteer');
const express = require('express')
require(`dotenv`).config()
const fs = require(`fs`).promises
const path = require(`path`);
const cors = require(`cors`)
const mongoose = require('mongoose');
const Connect = require(`./connects`);
const { throws } = require('assert');
const urlDB = `mongodb+srv://maxbr:${process.env.PASSWORD}@linkedinbot.5na6jwe.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(urlDB)
mongoose.set('strictQuery',false)

const app = express()
app.use(express.json())
app.use(cors())

const retrieveUserDetails = () => {
    const target = path.join(__dirname, `/config.json`)
    const content  = fs.existsSync(target) ? fs.readFileSync(target, `utf8`) : ""
    const result = JSON.parse(content)
    console.log("fdsa")
    if("username" in result && "password" in result){
        return result
    }
    else  {  
        return undefined 
    }
}


const usernameInputSelector = "div.text-input.flex input[id=session_key]"
const passwordInputSelector = "div.text-input.flex input[id=session_password]"
const signInSelector = "div[data-id=sign-in-form__footer] button[data-id=sign-in-form__submit-btn]"
//const searchBarButtonSelector = "button.search-global-typeahead__collapsed-search-button"
const homeButtonSelector = "li.global-nav__primary-item a.app-aware-link.global-nav__primary-link"
const searchBarInputSelector = "input.search-global-typeahead__input"
const searchCategoryButtonSelector = "button.artdeco-pill.artdeco-pill--slate.artdeco-pill--choice.artdeco-pill--2";
const connectButtonSelector = "button:has(li-icon[type='connect'])";
const connectNameSelector = "div.artdeco-modal.artdeco-modal--layer-default.send-invite div.artdeco-modal__content.ember-view strong"
const sendConnectButtonSelector = "div.artdeco-modal__actionbar.ember-view.text-align-right button.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view.ml1"
const pagesBoxSelector = "ul.artdeco-pagination__pages.artdeco-pagination__pages--number"
const nextPageButtonSelector = "button.artdeco-pagination__button.artdeco-pagination__button--next.artdeco-button.artdeco-button--muted.artdeco-button--icon-right.artdeco-button--1.artdeco-button--tertiary.ember-view[aria-label=\"Next\"]"
const connectsListSelector = "ul.reusable-search__entity-result-list.list-style-none"
const addANoteButtonSelector = "button.artdeco-button.artdeco-button--muted.artdeco-button--2.artdeco-button--secondary.ember-view.mr1[aria-label='Add a note']";
const noteTextBoxSelector = `textarea[id="custom-message"]`
const sendWithNoteButtonSelector = 'button.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view.ml1[aria-label="Send now"]';
const upperBarProfileButtonSelector = `button.global-nav__primary-link.global-nav__primary-link-me-menu-trigger.artdeco-dropdown__trigger.artdeco-dropdown__trigger--placement-bottom.ember-view`
const viewProfileButtonSelector = `a.ember-view.artdeco-button.artdeco-button--secondary.artdeco-button--1.mt2.full-width`
const logOutButtonSelector = `a.global-nav__secondary-link.mv1`
const profileConnectionsLinkSelector = `ul.pv-top-card--list.pv-top-card--list-bullet li.text-body-small:not(.t-black--light.inline-block) a.ember-view`
const searchWithFiltersLinkSelector = `a.ember-view.mn-connections__search-with-filters.link-without-visited-state`
const profileConnectionsNextPageButtonSelector = `button.artdeco-pagination__button.artdeco-pagination__button--next.artdeco-button.artdeco-button--muted.artdeco-button--icon-right.artdeco-button--1.artdeco-button--tertiary.ember-view[aria-label=\"Next\"]`

// const rememberAndSignOutSelector = ``
// const dontRememberAndSignOutSelector=`button[id="491"]`

const typingDelay = 35
const actionSubmittingDelayRange = {min:500, max:1000}

let browser = undefined;
let page = undefined;
let currentUser = undefined
let loopThroughConnects = false
let connectionsSent = [];
let connectionsAccepted = [];

const saveConnection = async (profileName, connectionSendingDate, isAccepted ,user) => {
    if(profileName == undefined || isAccepted == undefined || user == undefined){
        console.log("error at saveConnection!")
        throws(() => {return}, "profileName or isAccepted fields arent defined")
    } else {
    const connect = {
        profile_name: profileName,
        connection_sending_date: connectionSendingDate,
        isAccepted: isAccepted,
        user: user
    }
    const options = {
        upsert: true,
        new: true,
        maxTimeMS: 30000
    }
    if(connectionSendingDate)
        await Connect.findOneAndUpdate({profile_name: profileName, user:user} , {connection_sending_date: connectionSendingDate, isAccepted: isAccepted}, options).exec(). catch((err) => console.log(err, "findOneAndUpdate Error1"))
    else
        await Connect.findOneAndUpdate({profile_name: profileName, user:user}, {isAccepted: true}, options).exec(). catch((err) => console.log(err, "findOneAndUpdate Error2"))

    }   
}

const fetchAllConnections = async (user) => {
    return await Connect.find({ user: user})
}

const waitTillHTMLRendered = async (page, timeout = 30000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;
  
    while(checkCounts++ <= maxChecks){
      let html = await page.content(). catch((err) => {console.log("error caught:", err); return false});
      let currentHTMLSize = html.length; 
  
      let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
  
      //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);
  
      if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
        countStableSizeIterations++;
      else 
        countStableSizeIterations = 0; //reset the counter
  
      if(countStableSizeIterations >= minStableSizeIterations) {
        console.log("Page rendered fully..");
        return true;
      }
  
      lastHTMLSize = currentHTMLSize;
      await page.waitForTimeout(checkDurationMsecs);
    }  
    return false;
  };

const press = async (selector,key) => {
    const delay = typingDelay
    await page.waitForSelector(selector)
    await page.click(selector)
    await new Promise((resolve) => setTimeout(resolve ,delay))
    await page.keyboard.press(key)
}

const click = async (selector, timeout) => {
    const delay = Math.random()*( actionSubmittingDelayRange["max"]-actionSubmittingDelayRange["min"]) + actionSubmittingDelayRange["min"]
    if (timeout)
       await page.waitForSelector(selector, {timeout: timeout})
    else
    await page.waitForSelector(selector)
    await new Promise((resolve) => setTimeout(resolve ,delay))
    await page.click(selector)
}

const type = async ( selector, typeString) => {
    await page.waitForSelector(selector)
    while (typeString.length != 0){
        await new Promise((resolve) => setTimeout(resolve ,typingDelay))
        await page.type(selector, typeString[0])
        typeString = typeString.slice(1)
    }
}

const deleteText = async (selector) => {
    await page.waitForSelector(selector)
    const text = await page.$eval(selector, (element) => element.value)
    for (let i = 0; i < text.length; i++) {
      await press(selector, 'Backspace'); // Use press function with selector and key
    }
}

let setup = async function () {
    if(!page) {
        browser = await puppeteer.launch({headless: false});
        page = await browser.newPage();
        await page.setDefaultTimeout(0)
        await page.setViewport({width: 1080, height: 1024});
    }
}

const saveCookie = async (page) => {
    const cookies = await page.cookies();
    const cookieJson = JSON.stringify(cookies, null, 2);
    await fs.writeFile('cookies.json', cookieJson);
}

const loadCookie = async (page) => {
    let flag = false
    const cookieJson = await fs.readFile('cookies.json');
    flag = cookieJson.length !=0 ? true : false
    if(flag){
        const cookies = await JSON.parse(cookieJson);
        await page.setCookie(...cookies);
    }
    return flag
}

const deleteCookie = async (page) => {
    const cookieJson = await fs.readFile('cookies.json');
    const cookies = JSON.parse(cookieJson);
    page.deleteCookie(...cookies)
    await fs.writeFile('cookies.json', "[]")
}

const isLoggedIn = async (page) => {
    const loggedIn = await new Promise ( (resolve) => {
        let x = page.waitForSelector(upperBarProfileButtonSelector).then((res) => true). catch( (err) => false)
        let y = page.waitForSelector(signInSelector).then( (res) => false). catch((err) => true)  
        Promise.race([x,y]).then( (result) => resolve(result))
    })
    console.log("is loggged in? :",loggedIn)
    return loggedIn
}

app.post('/checkConnects', async (req,res) => {
    if(loopThroughConnects){
        res.send("already active")
        return;
    }
    if(!currentUser){
        res.send("didnt login yet")
        return;
    }
    loopThroughConnects = true
    const allConnections = []
    let isDone = true
    try{
        await click(upperBarProfileButtonSelector)
        await click(viewProfileButtonSelector)
        await click(profileConnectionsLinkSelector)
        await click(searchWithFiltersLinkSelector, 8000).catch((err)=> {return})
        while (loopThroughConnects) {
            //await page.waitForSelector("li.reusable-search__result-container a.app-aware-link span[aria-hidden=\"true\"")
            await waitTillHTMLRendered(page, 15000)
            const x = await page.evaluate ( () => {
                let ele = Array.from(document.querySelectorAll("li.reusable-search__result-container a.app-aware-link span[aria-hidden=\"true\""))
                ele = ele.map( (node) => node.textContent)
                return ele
            })
            console.log(x.length,"-------------")
            await x.forEach( async (name, i) => {console.log(i,"curUser:",currentUser); allConnections.push(name); await saveConnection(name,undefined, true, currentUser);})
            await page.waitForSelector(profileConnectionsNextPageButtonSelector)
            if( await page.evaluate((selector) => document.querySelector(selector).disabled ,profileConnectionsNextPageButtonSelector)) {
                loopThroughConnects = false
            } else {
                await click(profileConnectionsNextPageButtonSelector)
            }
        }
    } catch (err) { console.log("err: ",err); isDone = false; loopThroughConnects = false }
    connectionsSent.forEach ( (conn) => {
        if(allConnections.includes(conn))
            connectionsAccepted.push(conn)
       })
    res.json({
              done: isDone,
              allConnections: allConnections,
              connectionsSent: connectionsSent, 
              connectionsAccepted: connectionsAccepted
        })
})

//log in  to the linkedin account
//structure of req.body: {username: x:string , password: y:string}
app.post ('/login',  async (req, res) => {
    console.log("/login", " req.body: ",req.body)
    await setup()
    await loadCookie(page)
    const response = await page.goto('https://www.linkedin.com/'). catch( async (err) => {console.log("reloading!"); await page.reload();})
    //await page.waitForNavigation()
    let isNotLoggedIn = true
    //await page.waitForSelector(signInSelector, {timeout: 7000}).catch( (err) => isNotLoggedIn = false)
    isNotLoggedIn = ! await isLoggedIn(page)
    console.log("abc ",String(currentUser!=req.body.username))
    if(currentUser != req.body.username && currentUser != undefined && !isNotLoggedIn) {
        await click(upperBarProfileButtonSelector)
        await click (logOutButtonSelector)
    }
    currentUser = req.body.username
    if(isNotLoggedIn){
        await type(usernameInputSelector, req.body.username)
        await type( passwordInputSelector,req.body.password)
        await click(signInSelector)
    }
    await saveCookie(page)
    if(await isLoggedIn(page))
        res.send("logged in!") 
    else
        res.send('failed to log in!')
})

app.post('/logout', async(req, res) => {
    loopThroughConnects = false
    connectionsSent = []
    await saveCookie(page)
    await click(upperBarProfileButtonSelector)
    await click (logOutButtonSelector)
    currentUser = undefined
    res.send("logged out!")
})

app.post('/setupWithoutCookies', async (req, res) => {
    await setup()
    await deleteCookie(page).then((response) => res.send("deleted cookies"))
    .catch ((err) => console.log(err))
})

app.get(`/fetch/:username`, async (req, res) => {
    const username = req.params.username
    const all = await fetchAllConnections(username)
    console.log(all)
    res.json(all)
})


// client send information of who to look up at the search bar 
//structure of req.body: [{searchPhrase: x:string, amount: y:number, note: z:string} , ... , ...]
app.post('/assignment', async (req, res) => {
    console.log("/assignment"," req.body: ",req.body);
    const connections = []
    let isDone = true
    try{
    const homeHref = await page.evaluate( (selector) => document.querySelector(selector).getAttribute("href") ,homeButtonSelector)
    await Promise.all([
        page.waitForNavigation(), 
        page.goto(homeHref),      
    ]);
    for(let i = 0; i < req.body.length; i++){
        let phrase = req.body[i].searchPhrase
        let amount = req.body[i].amount
        let note = req.body[i].note
        await deleteText(searchBarInputSelector)
        await type(searchBarInputSelector, phrase)
        await press(searchBarInputSelector,'Enter')
        await page.waitForSelector(searchCategoryButtonSelector)
        const [peopleCategoryButton] = await page.$x(" //button[contains(., 'People')]");
        const delay = Math.random()*( actionSubmittingDelayRange["max"]-actionSubmittingDelayRange["min"]) + actionSubmittingDelayRange["min"]
        await new Promise((resolve) => setTimeout(resolve ,delay))
        await peopleCategoryButton.click()
        await waitTillHTMLRendered(page, 10000)
        for(let j = 0; j<amount ; j++){
            await page.waitForSelector(connectButtonSelector, {timeout: 7000})
            .then( async (res) => {
                let x = await page.waitForSelector(connectsListSelector)
                let y = await page.waitForSelector(connectButtonSelector)
                const connectTo = await page.evaluate( async (selector) => {
                    const button = document.querySelector(selector)
                    await console.log("the button: ", button)
                    const ariaLabel = await button.getAttribute("aria-label")
                    await console.log("the aria label of the connect is: ",ariaLabel)
                    return ariaLabel
                }, connectButtonSelector)
                await click(connectButtonSelector)
                const profileName = await page.evaluate( (selector) => document.querySelector(selector).textContent ,connectNameSelector)
                if(!note || note.length == 0 )
                    await click(sendConnectButtonSelector)
                else {
                    await click(addANoteButtonSelector)
                    await type(noteTextBoxSelector, note)
                    await click(sendWithNoteButtonSelector)
                }
                console.log("date: ", new Date())
                await saveConnection(profileName, new Date().toString() , false, currentUser)
                connectionsSent.push(profileName)
                connections.push(profileName)
                console.log("connection sent to : ",profileName)
            })
            .catch( async (err) => {
                console.log("couldnt find another connect on this page")
                try{
                    if(await page.evaluate( (selector) => document.querySelector(selector).disabled ,nextPageButtonSelector)){
                        j=amount
                        console.log("no more connections left under search phrase \"",phrase, "\" ")
                    }
                    else{
                        await click(nextPageButtonSelector)
                        await waitTillHTMLRendered(page, 10000)
                        j--;
                    }
                } catch (err) {
                    isDone = false
                    j=amount
                    console.log("no more connections left under search phrase \"",phrase, "\" ")
                }
            })
        }
       
    }

    } catch (err){
        console.log("caught error: ",err)
        isDone = false
    }
    res.json({done: isDone,
              requestsSent: connections
             })
    
})

const PORT = process.env.PORT
app.listen(PORT, () => console.log(`Server listening in port ${PORT}`))
