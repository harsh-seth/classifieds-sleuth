import qs from "query-string";
import { getProperty } from "dot-prop";
import listingConf from "./listing_config.json";

// # ------------ #
const headers = {
  "content-type": "application/json",
};

// # ------------ #
const getBody = async (url, headers, method = "GET", body = null) => {
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
      console.log(`Querying: "${company}" [page: ${pageNum}]`);
      const body = await getBody(target, headers, method, payload);
      result = getProperty(body, positions_key);
    } catch {
      console.log(
        `Failure when querying "${company}" [page ${pageNum}] - exiting early`
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
    `Done querying: "${company}". Found ${positions.length} positions`
  );
  return positions;
};

const standardizeResults = (positions: object[], company, keys) => {
  const { pos_id_key, pos_title_key } = keys;
  return positions.map((position) => [
    company,
    getProperty(position, pos_id_key),
    getProperty(position, pos_title_key),
  ]);
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
  .then(positions => {
    positions = positions.flat(1)
    console.log(`Done querying all companies`);
    console.log(positions)
    // TODO: Persist results somewhere
  })
  .then
  // TODO: Compute diff b/w persisted results
  ();
