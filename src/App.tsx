import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { TextField, Pivot, PivotItem, Stack, PrimaryButton, Label, Icon, Layer, Popup, Overlay, FocusTrapZone, DefaultButton, mergeStyleSets, Separator } from "@fluentui/react";
import './App.css';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { useBoolean } from '@fluentui/react-hooks';

initializeIcons();

// Define some constants
const INFLATION_RATE = 0.03;
const INVESTMENT_RATE = 0.07;
const DEFAULT_YEARS = 30;

const popupStyles = mergeStyleSets({
  root: {
    background: 'rgba(0, 0, 0, 0.2)',
    bottom: '0',
    left: '0',
    position: 'fixed',
    right: '0',
    top: '0',
  },
  content: {
    background: 'white',
    left: '50%',
    maxWidth: '400px',
    padding: '0 2em 2em',
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  },
});

// Define a type for the input data
type InputData = {
  startingCash: number;
  monthlyIncome: number;
  currentRent: number;
  expectedHouseCost: number;
  years: number;
  homeInterest: number;
  taxes: number;
};

// Define a type for the output data
type OutputData = {
  year: number;
  initialCash: number;
  houseValue: number;
  rentOrMortgage: number;
  moneySpent: number;
  moneyAvailable: number;
  netInvestment: number;
  netWorth: number;
};

// Define a function to calculate the monthly mortgage payment given the house cost, down payment and interest rate
function calculateMortgage(
  houseCost: number,
  downPayment: number,
  extraMonthlyFees: number,
  interestRate: number,
  years: number
): number {
  const principal = houseCost - downPayment;
  const monthlyRate = (interestRate / 12)// + extraMonthlyFees;
  const n = years * 12;
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, n);
  const denominator = Math.pow(1 + monthlyRate, n) - 1;
  const mortgage = numerator / denominator;
  return mortgage + extraMonthlyFees;
}

// Define a function to calculate the output data for renting, buying with 5% down or buying with 20% down
function calculateOutput(
  inputData: InputData,
  option: "rent" | "buy5" | "buy20"
): OutputData[] {
  // Initialize an empty array to store the output data
  const outputData: OutputData[] = [];

  // Initialize some variables to keep track of the current values
  let initialCash = inputData.startingCash;
  let downPayment = 0;
  if (option === "buy5") {
    downPayment = inputData.expectedHouseCost * 0.05;
  }
  if (option === "buy20") {
    downPayment = inputData.expectedHouseCost * 0.2;
  }
  let houseValue = option === "rent" ? 0 : inputData.expectedHouseCost;
  let rentOrMortgage = option === "rent" ? inputData.currentRent : calculateMortgage(inputData.expectedHouseCost, downPayment, inputData.taxes, inputData.homeInterest, inputData.years);
  let moneySpent = rentOrMortgage * 12;
  let moneyAvailable = inputData.monthlyIncome;
  let netInvestment = moneyAvailable * 12 - moneySpent;
  let netWorth = initialCash;

  // Loop through the years and calculate the output data for each year
  for (let year = 0; year <= inputData.years; year++) {
    // Push the current values to the output data array
    outputData.push({
      year,
      initialCash,
      houseValue,
      rentOrMortgage,
      moneySpent,
      moneyAvailable,
      netInvestment,
      netWorth
    });

    // subtract the down payment
    if (year === 0) {
      if (option === "buy5") {
        initialCash = initialCash - (.05 * inputData.expectedHouseCost);
      }
      if (option === "buy20") {
        initialCash = initialCash - (.2 * inputData.expectedHouseCost);
      }
    }

    // Update the current values for the next year
    houseValue = calculateHouseValue(option, inputData, year + 1);
    initialCash = initialCash * (1 + INVESTMENT_RATE) + netInvestment; // Add the investment returns and the net investment to the initial cash
    rentOrMortgage =
      option === "rent"
        ? rentOrMortgage * (1 + INFLATION_RATE) // Increase the rent by the inflation rate
        : rentOrMortgage; // Keep the mortgage constant
    moneySpent = rentOrMortgage * 12; // Multiply the rent or mortgage by 12 months
    netInvestment = moneyAvailable * 12 - moneySpent; // Subtract the money spent from the money available times 12 months
    const paidOffHouse = (houseValue / 30) * ((year + 1 < 0 ? 0 : year + 1));
    netWorth = initialCash + paidOffHouse;
  }

  // Return the output data array
  return outputData;
}

// Calculate what the house will be worth after a certain number of years
function calculateHouseValue(type: string, inputData: InputData, years: number) {
  return type === "rent" ? 0 : inputData.expectedHouseCost * Math.pow(1 + INFLATION_RATE, years);
}

// Define a function to format a number as currency
function formatCurrency(num: number): string {
  return "$" + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Define a type for the summary data
type SummaryData = {
  cash: number;
  homeValue: number;
  netWorth: number;
  difference: number;
};

/// Define a function to calculate the summary data for renting vs buying
function calculateSummary(
  inputData: InputData
): { rent: SummaryData; buy5: SummaryData; buy20: SummaryData } {
  // Get the output data for each option
  const outputData1 = calculateOutput(inputData, 'rent');
  const outputData2 = calculateOutput(inputData, 'buy5');
  const outputData3 = calculateOutput(inputData, 'buy20');

  // Get the final values for each option
  const finalValue1 = outputData1[outputData1.length - 1].initialCash;
  const finalValue2 = outputData2[outputData2.length - 1].initialCash + calculateHouseValue("buy5", inputData, inputData.years);
  const finalValue3 = outputData3[outputData3.length - 1].initialCash + calculateHouseValue("buy20", inputData, inputData.years);

  // Find the best option by finding the maximum net worth
  const bestOption = Math.max(finalValue1, finalValue2, finalValue3);

  // Return an object with the summary data for each option
  return {
    rent: {
      cash: finalValue1,
      homeValue: 0,
      netWorth: finalValue1,
      difference: bestOption - finalValue1
    },
    buy5: {
      cash: outputData2[outputData2.length - 1].initialCash,
      homeValue: calculateHouseValue("buy5", inputData, inputData.years),
      netWorth: outputData2[outputData2.length - 1].netWorth,
      difference: bestOption - outputData2[outputData2.length - 1].netWorth
    },
    buy20: {
      cash: outputData3[outputData3.length - 1].initialCash,
      homeValue: calculateHouseValue("buy20", inputData, inputData.years),
      netWorth: outputData3[outputData3.length - 1].netWorth,
      difference: bestOption - outputData3[outputData3.length - 1].netWorth
    }
  };
}

// Define a component to render a table with the output data
function OutputTable(props: { data: OutputData[]; title: string }) {
  return (
    <div>
      <h3>
        {props.title}
      </h3>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Networth</th>
            <th>Cash</th>
            <th>House Value</th>
            <th>Rent</th>
            <th>Yearly Rent</th>
            <th>Monthly Income</th>
            <th>Yearly Net Investment Money</th>
          </tr>
        </thead>
        <tbody>
          {props.data.map((row) => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>{formatCurrency(row.netWorth)}</td>
              <td>{formatCurrency(row.initialCash)}</td>
              <td>{formatCurrency(row.houseValue)}</td>
              <td>{formatCurrency(row.rentOrMortgage)}</td>
              <td>{formatCurrency(row.moneySpent)}</td>
              <td>{formatCurrency(row.moneyAvailable)}</td>
              <td>{formatCurrency(row.netInvestment)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Define a component to render a chart with the output data
function OutputChart(props: { data1: OutputData[]; data2: OutputData[]; data3: OutputData[] }) {
  return (
    <Pivot>
      <PivotItem headerText="Networth">
        <h3>Networth</h3>
        <LineChart width={500} height={400}>
          <XAxis allowDuplicatedCategory={false} dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" data={props.data1} dataKey="netWorth" name="Renting" stroke="#8884d8" />
          <Line type="monotone" data={props.data2} dataKey="netWorth" name="Buying with 5% Down Payment" stroke="#82ca9d" />
          <Line type="monotone" data={props.data3} dataKey="netWorth" name="Buying with 20% Down Payment" stroke="#ffc658" />
        </LineChart>
      </PivotItem>
      <PivotItem headerText="Cash">
        <h3>Cash</h3>
        <LineChart width={500} height={400}>
          <XAxis allowDuplicatedCategory={false} dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" data={props.data1} dataKey="initialCash" name="Renting" stroke="#8884d8" />
          <Line type="monotone" data={props.data2} dataKey="initialCash" name="Buying with 5% Down Payment" stroke="#82ca9d" />
          <Line type="monotone" data={props.data3} dataKey="initialCash" name="Buying with 20% Down Payment" stroke="#ffc658" />
        </LineChart>
      </PivotItem>
    </Pivot>
  );
}

// Define a component to render a summary with the output data
function OutputSummary(props: { data: InputData }) {
  // Get the summary data for each option
  const summaryData = calculateSummary(props.data);
  const bestOption = summaryData.rent.difference === 0 ? "Renting" : summaryData.buy5.difference === 0 ? "Buy a house with 5% down payment" : "Buy a house with 20% down payment";

  // Return the JSX element for the summary
  return (
    <Stack {...{
      tokens: { childrenGap: 15 },
      styles: { root: { paddingTop: 40 } },
    }}>
      <Label style={{ fontSize: 20 }}>Best Option: <span style={{ paddingLeft: 25, fontWeight: "bold" }}>{bestOption}</span></Label>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Cash</th>
            <th>Home Value</th>
            <th>Total Net Worth</th>
            <th>Difference from Best Option</th>
          </tr>
        </thead>
        <tbody>
          <tr style={summaryData.rent.difference === 0 ? { fontWeight: "bold", color: "green" } : {}}>
            <td>Rent</td>
            <td>{formatCurrency(summaryData.rent.cash)}</td>
            <td>{formatCurrency(summaryData.rent.homeValue)}</td>
            <td>{formatCurrency(summaryData.rent.netWorth)}</td>
            <td>{formatCurrency(summaryData.rent.difference)}</td>
          </tr>
          <tr style={summaryData.buy5.difference === 0 ? { fontWeight: "bold", color: "green" } : {}}>
            <td>Buy with 5% Down Payment</td>
            <td>{formatCurrency(summaryData.buy5.cash)}</td>
            <td>{formatCurrency(summaryData.buy5.homeValue)}</td>
            <td>{formatCurrency(summaryData.buy5.netWorth)}</td>
            <td>{formatCurrency(summaryData.buy5.difference)}</td>
          </tr>
          <tr style={summaryData.buy20.difference === 0 ? { fontWeight: "bold", color: "green" } : {}}>
            <td>Buy with 20% Down Payment</td>
            <td>{formatCurrency(summaryData.buy20.cash)}</td>
            <td>{formatCurrency(summaryData.buy20.homeValue)}</td>
            <td>{formatCurrency(summaryData.buy20.netWorth)}</td>
            <td>{formatCurrency(summaryData.buy20.difference)}</td>
          </tr>
        </tbody>
      </table>
    </Stack>
  );
}

// Define a component to render the input fields and the calculate button
const InputForm = (props: { onSubmit: (data: InputData) => void }) => {
  // Define some state variables to store the input values
  const [monthlyIncome, setMonthlyIncome] = useState(4000);
  const [currentRent, setCurrentRent] = useState(2000);
  const [expectedHouseCost, setExpectedHouseCost] = useState(700000);
  const [startingCash, setStartingCash] = useState(.2 * expectedHouseCost);
  const [years, setYears] = useState(DEFAULT_YEARS);
  const [homeInterest, setHomeInterest] = useState(.07);
  const [taxes, setTaxes] = useState(.001 * expectedHouseCost);

  // Define a function to handle the submit event
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent the default behavior of reloading the page

    const inputData: InputData = { startingCash, monthlyIncome, currentRent, expectedHouseCost, years, homeInterest, taxes };
    props.onSubmit(inputData); // Call the onSubmit prop function with the input data
  }

  // Return the JSX element for the input form
  return (
    <form onSubmit={handleSubmit}>
      <Stack {...{
        tokens: { childrenGap: 15 },
        styles: { root: { paddingLeft: 40, width: 300 } },
      }}>
        {/* <TextField
          label="Starting Cash"
          type="number"
          defaultValue={startingCash.toString()}
          onChange={(event, value) => setStartingCash(Number(value))}
        /> */}
        <TextField
          label="Monthly Income (available for either rent or investing)"
          type="number"
          defaultValue={monthlyIncome.toString()}
          onChange={(event, value) => setMonthlyIncome(Number(value))}
        />
        <TextField
          label="Current Rent Cost"
          type="number"
          defaultValue={currentRent.toString()}
          onChange={(event, value) => setCurrentRent(Number(value))}
        />
        <TextField
          label="Expected House Cost"
          type="number"
          defaultValue={expectedHouseCost.toString()}
          onChange={(event, value) => { setExpectedHouseCost(Number(value)); setTaxes((Number(value) * .001)); setStartingCash(.2 * Number(value)) }}
        />
        <TextField
          label="Monthly Taxes and Other Fees"
          type="number"
          value={taxes.toString()}
          defaultValue={taxes.toString()}
          onChange={(event, value) => setTaxes(Number(value))}
        />
        <TextField
          label="Home Interest Rate"
          type="number"
          defaultValue={"7"}
          onChange={(event, value) => setHomeInterest((Number(value) / 100.0))}
        />
        <TextField
          label="Years"
          type="number"
          defaultValue={years.toString()}
          onChange={(event, value) => setYears(Number(value))}
        />
        <PrimaryButton type="submit">Calculate</PrimaryButton>
      </Stack>
    </form>
  );
}

// Define a component to render the whole app
function App() {
  // Define a state variable to store the input data
  const [inputData, setInputData] = useState<InputData | null>(null);

  // Define a function to handle the input form submission
  function handleInputSubmit(data: InputData) {
    setInputData(data); // Set the input data state variable to the submitted data
  }

  const [isPopupVisible, { setTrue: showPopup, setFalse: hidePopup }] = useBoolean(false);

  // Return the JSX element for the app
  return (
    <div className="App">
      <h1 style={{ textAlign: "center" }}>Renting vs Buying Calculator <Icon onClick={showPopup} style={{ cursor: "pointer", verticalAlign: "middle" }} iconName="info" /></h1>
      {isPopupVisible && (
        <Layer>
          <Popup
            className={popupStyles.root}
            role="dialog"
            aria-modal="true"
            onDismiss={hidePopup}
          >
            <Overlay onClick={hidePopup} />
            <FocusTrapZone>
              <Stack tokens={{ childrenGap: 10 }} role="document" className={popupStyles.content}>
                <h2 style={{ paddingTop: 10, textAlign: "center" }}>About</h2>
                <Separator></Separator>
                <p>
                  This tool is meant to show the difference in savings/networth one can accumulate if they rent vs buy.
                </p>
                <p>To calculate this we assume a 7% return on investment and a 3% increase in home value per year.</p>
                <DefaultButton onClick={hidePopup}>Close Popup</DefaultButton>
              </Stack>
            </FocusTrapZone>
          </Popup>
        </Layer>
      )}
      <Stack horizontal wrap horizontalAlign="space-around">
        <InputForm onSubmit={handleInputSubmit} />
        <Stack>
          {inputData && (
            <>
              <Pivot>
                <PivotItem headerText="Table">
                  <OutputTable data={calculateOutput(inputData, "rent")} title="Renting" />
                  <OutputTable data={calculateOutput(inputData, "buy5")} title="Buying with 5% Down Payment" />
                  <OutputTable data={calculateOutput(inputData, "buy20")} title="Buying with 20% Down Payment" />
                </PivotItem>
                <PivotItem headerText="Chart">
                  <OutputChart
                    data1={calculateOutput(inputData, "rent")}
                    data2={calculateOutput(inputData, "buy5")}
                    data3={calculateOutput(inputData, "buy20")}
                  />
                </PivotItem>
                <PivotItem headerText="Summary">
                  <OutputSummary data={inputData} />
                </PivotItem>
              </Pivot>
            </>
          )}
        </Stack>
      </Stack>
    </div>
  );
}

export default App;