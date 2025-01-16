import qs from "query-string";
import { getProperty } from "dot-prop";
import listingConf from "./listing_config.json";

// # ------------ #
const headers = {
  "content-type": "application/json",
};

// # ------------ #
const getBody = async (url, headers) => {
  const res = await fetch(url, {
    headers: headers,
    method: "GET",
    body: null,
  });
  return await res.json();
};

const getCompanyPositions = async (conf, meta) => {
  const { url, query, positions_key } = conf;
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
      const body = await getBody(target, headers);
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

Object.keys(listingConf).forEach(async (company) => {
  // Get results for each company in listing config
  getCompanyPositions(listingConf[company], { company }).then((positions) =>
    console.log(positions.length)
  );

  // TODO: Persist results somewhere
});

// TODO: Compute diff b/w persisted results
