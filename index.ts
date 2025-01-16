import qs from "query-string";
import { getProperty } from "dot-prop";
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
  "staff",
  "manager",
  "director",
  "intern",
  "ios",
  "android",
  "mobile",
];

// # ------------ #
const getBody = async (
  url: string,
  headers,
  method: string = "GET",
  body: string|null|undefined = null
) => {
  const res = await fetch(url, {
    headers,
    method,
    body,
  });
  return await res.json();
};

const getCompanyPositions = async (conf, meta) => {
  const {
    url,
    method,
    query = null,
    payload = null,
    keys: { positions_key },
  } = conf;
  const { company } = meta;
  const target = qs.stringifyUrl({ url, query });

  const positions: object[] = [];
  let result: object[] | undefined = [];
  let pageNum = 1;

  // Get results from all search pages
  while (true) {
    try {
      // Get one page of results
      console.log(`- Querying: "${company}" [page: ${pageNum}]`);
      const body = await getBody(target, headers, method, JSON.stringify(payload));
      result = getProperty(body, positions_key);
    } catch {
      console.log(
        `[!!] Failure when querying "${company}" [page ${pageNum}] - exiting early`
      );
      break;
    }

    // Checking if last page or invalid query
    if (!result || result.length == 0) break;

    // Accumulate results
    positions.push(...result);

    // Prepare for next page search
    pageNum++;
    break; // TODO: Remove this and add next page logic (needs more portal examples to build general solution)
    // TODO:: Add timeouts to prevent ratelimiting
  }
  console.log(
    `- Done querying: "${company}". Found ${positions.length} positions`
  );
  return positions;
};

const standardizeResults = (
  positions: object[],
  company: string,
  keys
): jobListing[] => {
  const { pos_id_key, pos_title_key } = keys;
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
    const lowercaseTitle = position.title.toLowerCase();
    return !blocklist_title_tags.some((tag) => lowercaseTitle.includes(tag));
  });
};

// # ------------ #
// ## START HERE
const companyKeys = Object.keys(listingConf); // ensures deterministic order, and easier wrangling

// Get standardized results for each company in listing config
console.log(`Will query ${companyKeys.length} companies.`);
const positionQueryPromises = companyKeys.map(
  (company) =>
    getCompanyPositions(listingConf[company], { company }) // get raw results
      .then((positions) =>
        standardizeResults(positions, company, listingConf[company].keys)
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

    // TODO: Persist results somewhere
  })
  .then(); // TODO: Compute diff b/w persisted results
