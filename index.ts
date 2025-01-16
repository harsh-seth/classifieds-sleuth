import qs from "query-string";
import { getProperty, setProperty } from "dot-prop";
import { stringify } from "csv-stringify/sync";
import fs from 'fs';
import listingConf from "./listing_config.json";

type jobListing = {
  company: string;
  id: string;
  title: string;
};

// # ------------ #
const headers = {
  "content-type": "application/json",
};

const blocklist_title_tags = [
  "intern",
  "staff",
  "mts",
  "lead",
  "consultant",
  "principal",
  "architect",
  "management",
  "manager",
  "director",
  "vp",
  "reliability",
  "support",
  "business",
  "analyst",
  "ios",
  "android",
  "mobile",
  ".net",
];

// # ------------ #
const getBody = async (
  url: string,
  headers,
  method: string = "GET",
  body: string | null | undefined = null
) => {
  const res = await fetch(url, {
    headers,
    method,
    body,
  });
  if (res.status == 404) return {};
  if (!res.ok) throw new Error(res.statusText);
  return await res.json();
};

const getCompanyPositions = async (conf, meta) => {
  const {
    url,
    method,
    response_keys: { positions: positions_key },
    request_keys: { search_start: search_start_key },
    request_cooldown_in_secs,
  } = conf;
  const { company } = meta;

  const positions: object[] = [];
  let result: object[] | undefined = [];
  let pageNum = 1;

  // Get results from all search pages
  while (true) {
    try {
      const { query = null, payload = null } = conf; // Need to fetch again to get updated start values
      const target = qs.stringifyUrl({ url, query });

      // Get one page of results
      const body = await getBody(
        target,
        headers,
        method,
        payload && JSON.stringify(payload) // Do not send payload if empty
      );
      result = getProperty(body, positions_key);
    } catch (err) {
      console.log(
        `[!!] Failure when querying "${company}" [page ${pageNum}] - exiting early - ${err}`
      );
      break;
    }

    // Checking if last page or invalid query
    if (!result || result.length == 0) break;

    // Accumulate results
    positions.push(...result);

    // Prepare for next page search
    pageNum++;
    setProperty(
      conf,
      search_start_key,
      (getProperty(conf, search_start_key) || 0) + result.length
    ); // Update search start position
    if (request_cooldown_in_secs)
      await new Promise((resolve) =>
        setTimeout(resolve, request_cooldown_in_secs * 1000)
      ); // Add timeouts to prevent ratelimiting
  }
  console.log(
    `- Done querying: "${company}". Found ${positions.length} positions on ${pageNum - 1} pages`
  );
  return positions;
};

const standardizeResults = (
  positions: object[],
  company: string,
  keys
): jobListing[] => {
  const { pos_id: pos_id_key, pos_title: pos_title_key } = keys;
  return positions.map((position) => ({
    company,
    id: `${getProperty(position, pos_id_key)}`, // converting numeric IDs to string
    title: getProperty(position, pos_title_key) || "",
    ...position,
  }));
};

// # ------------ #
const filterRelevantPositions = (positions: jobListing[]) => {
  return positions.filter((position) => {
    const lowercaseTitle = position.title.toLowerCase().replace(/[,/#!$%^&*;:{}=\-_`~()]/g, ' ');
    return !blocklist_title_tags.some((tag) => lowercaseTitle.includes(tag));
  });
};

// # ------------ #
// ## START HERE
const companyKeys = Object.keys(listingConf); // ensures deterministic order, and easier wrangling

// Get standardized results for each company in listing config
console.log(`Will query ${companyKeys.length} companies - ${companyKeys}`);
const positionQueryPromises = companyKeys.map(
  (company) =>
    getCompanyPositions(listingConf[company], { company }) // get raw results
      .then((positions) =>
        standardizeResults(
          positions,
          company,
          listingConf[company].response_keys
        )
      ) // standardize results
);

Promise.all(positionQueryPromises)
  .then((queryResults) => {
    // Filter results based off keyword blocklist
    let positions = queryResults.flat(1);
    const total_positions_count = positions.length;
    positions = filterRelevantPositions(positions);

    console.log(
      `Done querying all companies. Found ${positions.length} relevant positions (out of ${total_positions_count})`
    );

    // Persist results to file
    const output = stringify(positions, {header: true, columns: {company: "company", id: "id", title: "title"}})
    fs.writeFile(`positions-${Date.now()}.csv`, output, (err) => {
      if (err) throw err;
      console.log("Results saved to disk")
    })
  })
  .then(); // TODO: Compute diff b/w persisted results
