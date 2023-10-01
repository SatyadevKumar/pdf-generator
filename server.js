const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// Serve static HTML file for testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/generate-pdf', async (req, res) => {
  try {
    const data = req.body;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const response = fs.readFileSync(data.templateName+'.html', 'utf8');
    const templateContent = response;
    const renderedContent = Handlebars.compile(templateContent)(data);
    await page.setContent(renderedContent);

    // Create a chart using Chart.js
    await page.evaluate((data) => {
      const ctx = document.getElementById('chart').getContext('2d');
      console.log(data);
      const chartData = {
        labels: ['Equity Amount', 'US Equity', 'Non-US Equity'],
        datasets: [
          {
            label: 'Asset Allocation',
            backgroundColor: [
              'rgba(75, 192, 192, 0.2)',
              'rgba(255, 99, 132, 0.2)',
              'rgba(255, 206, 86, 0.2)',
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
            ],
            borderWidth: 1,
            data: [
              data['assetAllocation'][0].equityAmount,
              data['assetAllocation'][0].usEquity,
              data['assetAllocation'][0].nonUsEquity,
            ],
          },
        ],
      };

      const chartConfig = {
        type: 'bar',
        data: chartData,
        options: {
          animation: {
            duration: 0,
          }
        }
      };

      new Chart(ctx, chartConfig);
    }, data);

    const pdfBuffer = await page.pdf();

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=generated-pdf.pdf');
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
